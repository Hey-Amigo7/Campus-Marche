import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscrowStatus, PayoutMethod, PayoutStatus } from '@prisma/client';
import { calculateCommission, escrowToStatus, generateVerificationCode, ghsToPesewas, isEscrowPaid } from './commission.engine';
import type { NotificationService } from './notification.service';
import type { ChatGateway } from './chat.gateway';
import { PayoutService } from './payout.service';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';

// ─── Paystack response types ────────────────────────────────────────────────

type PaystackInitRes = {
  status: boolean;
  message: string;
  data?: { authorization_url: string; access_code: string; reference: string };
};

type PaystackVerifyRes = {
  status: boolean;
  message: string;
  data?: {
    status: string;
    paid_at?: string;
    reference: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  };
};

type PaystackChargeRes = {
  status: boolean;
  message: string;
  data?: { reference: string; status: string; display_text?: string };
};

type PaystackWebhookEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    paid_at?: string;
    transfer_code?: string;
    reason?: string;
    metadata?: {
      orderId?: string;
      userId?: string;
      plan?: string;
      type?: string;
    };
  };
};

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private walletService: WalletService,
    private payoutService: PayoutService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private chatGateway?: ChatGateway,
  ) {}

  private getSecret() {
    return this.config.get<string>('PAYSTACK_SECRET_KEY')?.trim();
  }

  private getFeeConfig() {
    return {
      feePercent: parseFloat(this.config.get<string>('MARKETPLACE_FEE_PERCENT')!),
      feeFixed:   parseFloat(this.config.get<string>('MARKETPLACE_FEE_FLAT')!),
    };
  }

  // ─── Initialize card payment ──────────────────────────────────────────────

  async initializeOrderPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, email: true } },
        product: { select: { id: true, title: true, sellerId: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can pay for this order');
    if (order.product.sellerId === userId) throw new BadRequestException('You cannot pay for your own listing');
    if (isEscrowPaid(order.escrowStatus)) throw new BadRequestException('This order has already been paid');

    const reference = `CM-${Date.now()}-${order.id.slice(-6)}`;
    const secret = this.getSecret();

    // Use stored totalAmount when available; recalculate for legacy orders where it defaulted to 0
    const { feePercent, feeFixed } = this.getFeeConfig();
    const chargeAmount = order.totalAmount > 0
      ? order.totalAmount
      : calculateCommission(order.price, feePercent, feeFixed).totalAmount;

    if (!secret) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured — returning dev placeholder');
      const tx = await this.prisma.paymentTransaction.create({
        data: { orderId: order.id, userId, reference, amount: chargeAmount, status: 'Dev mode — Paystack not configured' },
      });
      await this.prisma.order.update({
        where: { id: orderId },
        data: { escrowStatus: EscrowStatus.PAYMENT_INITIALIZED },
      });
      return tx;
    }

    const amountInPesewas = ghsToPesewas(chargeAmount);

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.buyer.email,
        amount: amountInPesewas,
        currency: 'GHS',
        reference,
        callback_url: `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/orders/${orderId}`,
        metadata: { orderId: order.id, productId: order.product.id, productTitle: order.product.title, userId },
      }),
    });

    const result = (await res.json()) as PaystackInitRes;
    if (!res.ok || !result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not initialize Paystack payment');
    }

    const [tx] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          userId,
          reference: result.data.reference,
          amount: order.totalAmount || order.price,
          status: 'Initialized',
          authorizationUrl: result.data.authorization_url,
          accessCode: result.data.access_code,
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { escrowStatus: EscrowStatus.PAYMENT_INITIALIZED, paymentReference: result.data.reference },
      }),
    ]);

    return tx;
  }

  // ─── Verify payment (buyer-triggered after Paystack redirect) ─────────────

  async verify(reference: string, userId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { order: { include: { product: { select: { sellerId: true, title: true } } } } },
    });

    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.userId !== userId) throw new ForbiddenException('You can only verify your own payment');
    if (payment.status === 'Paid') return payment; // already verified — idempotent

    const secret = this.getSecret();
    if (!secret) throw new BadRequestException('Paystack is not configured on this server');

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const result = (await res.json()) as PaystackVerifyRes;

    if (!res.ok || !result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not verify payment with Paystack');
    }

    if (result.data.status !== 'success') {
      await this.prisma.paymentTransaction.update({
        where: { reference },
        data: { status: result.data.status },
      });
      throw new BadRequestException(`Payment status is "${result.data.status}", not "success"`);
    }

    return this.fundEscrow(reference, result.data.paid_at ?? new Date().toISOString(), payment.order.product.sellerId);
  }

  // ─── Mobile money charge ──────────────────────────────────────────────────

  async chargeMobileMoney(orderId: string, userId: string, phone: string, provider: 'mtn' | 'vod' | 'tgo') {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { email: true } },
        product: { select: { id: true, title: true, sellerId: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can pay for this order');
    if (order.product.sellerId === userId) throw new BadRequestException('You cannot pay for your own listing');
    if (isEscrowPaid(order.escrowStatus)) throw new BadRequestException('This order has already been paid');

    const secret = this.getSecret();
    if (!secret) throw new BadRequestException('Paystack is not configured — contact support');

    const reference = `CM-MOMO-${Date.now()}-${order.id.slice(-6)}`;
    const { feePercent: fp, feeFixed: ff } = this.getFeeConfig();
    const momoChargeAmount = order.totalAmount > 0
      ? order.totalAmount
      : calculateCommission(order.price, fp, ff).totalAmount;
    const amountInPesewas = ghsToPesewas(momoChargeAmount);
    const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '233');

    const res = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.buyer.email,
        amount: amountInPesewas,
        currency: 'GHS',
        reference,
        mobile_money: { phone: normalizedPhone, provider },
        metadata: { orderId: order.id, productId: order.product.id, productTitle: order.product.title, paymentMethod: 'mobile_money', momoProvider: provider, userId },
      }),
    });

    const result = (await res.json()) as PaystackChargeRes;
    if (!res.ok || !result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not initiate mobile money charge');
    }

    await this.prisma.$transaction([
      this.prisma.paymentTransaction.create({
        data: {
          orderId: order.id,
          userId,
          reference: result.data.reference,
          amount: order.totalAmount || order.price,
          status: result.data.status,
          provider: `paystack_momo_${provider}`,
          metadata: JSON.stringify({ displayText: result.data.display_text }),
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { escrowStatus: EscrowStatus.PAYMENT_INITIALIZED, paymentReference: result.data.reference },
      }),
    ]);

    return {
      reference: result.data.reference,
      status: result.data.status,
      displayText: result.data.display_text ?? `Approve the ${provider.toUpperCase()} prompt on your phone`,
    };
  }

  // ─── Submit MoMo OTP ─────────────────────────────────────────────────────

  async submitMomoOtp(reference: string, otp: string) {
    const secret = this.getSecret();
    if (!secret) throw new BadRequestException('Paystack not configured');

    const res = await fetch('https://api.paystack.co/charge/submit_otp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, reference }),
    });

    const result = (await res.json()) as { status: boolean; message: string; data?: { reference: string; status: string; display_text?: string } };
    if (!res.ok || !result.data) {
      throw new BadRequestException(result.message || 'OTP submission failed');
    }

    return {
      reference: result.data.reference,
      status: result.data.status,
      displayText: result.data.display_text,
    };
  }

  // ─── Poll MoMo status ─────────────────────────────────────────────────────

  async checkMomoStatus(reference: string, userId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { order: { include: { product: { select: { sellerId: true } } } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException('Access denied');
    if (payment.status === 'Paid') return { status: 'success', paid: true };

    const secret = this.getSecret();
    if (!secret) throw new BadRequestException('Paystack not configured');

    const res = await fetch(`https://api.paystack.co/charge/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const result = (await res.json()) as PaystackVerifyRes;

    if (!result.status || !result.data) {
      throw new BadRequestException(result.message || 'Could not check payment status');
    }

    if (result.data.status === 'success') {
      await this.fundEscrow(reference, result.data.paid_at ?? new Date().toISOString(), payment.order.product.sellerId);
      return { status: 'success', paid: true };
    }

    return { status: result.data.status, paid: false };
  }

  // ─── Buyer confirms delivery → release escrow ─────────────────────────────

  async releaseEscrow(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can confirm delivery');
    return this.releaseEscrowInternal(orderId);
  }

  // ─── Internal release (called by delivery code verification) ─────────────

  async releaseEscrowInternal(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            sellerId: true,
            listingType: true,
            seller: { select: { name: true, business: { select: { momoProvider: true, momoPhone: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    const releasableStates: EscrowStatus[] = [EscrowStatus.ESCROW_HELD, EscrowStatus.SHIPPED, EscrowStatus.DELIVERED];
    // Pre-check (not atomic — the real atomic guard is updateMany inside the transaction below).
    if (!releasableStates.includes(order.escrowStatus as EscrowStatus)) {
      throw new BadRequestException(`Cannot release escrow — current status is ${order.escrowStatus}`);
    }

    const sellerId = order.sellerId ?? order.product.sellerId;
    const sellerAmount = order.sellerAmount || order.price;

    // Determine payout method from seller's business profile
    const momoProvider = order.product.seller.business?.momoProvider;
    const momoPhone    = order.product.seller.business?.momoPhone ?? undefined;
    let payoutMethod: PayoutMethod = PayoutMethod.MTN_MOMO;
    if (momoProvider?.toLowerCase().includes('vod') || momoProvider?.toLowerCase().includes('telecel')) {
      payoutMethod = PayoutMethod.TELECEL_CASH;
    } else if (momoProvider?.toLowerCase().includes('tgo') || momoProvider?.toLowerCase().includes('airteltigo')) {
      payoutMethod = PayoutMethod.AIRTELTIGO_MONEY;
    }

    // Create the payout record inside the same transaction as the balance update so a crash
    // between the two cannot leave availableBalance inflated with no corresponding payout.
    // A crash after commit leaves a PENDING payout that admin can retry-process safely.
    let createdPayoutId: string | null = null;
    let releaseWon = false;
    await this.prisma.$transaction(async (tx) => {
      // Atomic claim: transitions releasable states → RELEASE_PENDING in one conditional write.
      // Two concurrent release calls cannot both see count > 0 for the same order — the second
      // sees count=0 (state already moved) and aborts cleanly without double-crediting the wallet.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, escrowStatus: { in: releasableStates } },
        data: {
          escrowStatus: EscrowStatus.RELEASE_PENDING,
          status: 'Releasing funds',
          deliveryConfirmedAt: new Date(),
        },
      });
      if (count === 0) return; // concurrent call already won — abort cleanly

      releaseWon = true;
      await this.walletService.pendingToAvailable(sellerId, sellerAmount, tx);
      const payout = await tx.payout.create({
        data: { sellerId, orderId, amount: sellerAmount, payoutMethod },
      });
      createdPayoutId = payout.id;
    });

    if (!releaseWon) {
      throw new BadRequestException('Escrow was already released or is not in a releasable state');
    }

    // Network calls must not run inside a DB transaction.
    const autoApprove = this.config.get<string>('PAYOUT_AUTO_APPROVE') !== 'false';
    // Track whether processPayout ran successfully so we know which escrowStatus to emit.
    // processPayout emits RELEASED internally (test mode) or relies on transfer.success webhook (live).
    // When it succeeds, we must not override that emission with a stale RELEASE_PENDING.
    let payoutAutoProcessed = false;
    if (createdPayoutId && autoApprove) {
      try {
        await this.payoutService.processPayout(createdPayoutId, momoPhone);
        payoutAutoProcessed = true;
      } catch (err) {
        this.logger.error(`releaseEscrowInternal: auto-process payout ${createdPayoutId} failed: ${err instanceof Error ? err.message : String(err)}`);
        await this.prisma.payout.update({
          where: { id: createdPayoutId },
          data: { failureReason: err instanceof Error ? err.message : String(err) },
        }).catch(() => null);
      }
    } else if (createdPayoutId) {
      this.logger.log(`releaseEscrowInternal: payout ${createdPayoutId} created as PENDING — awaiting admin approval`);
    }

    const isServiceOrder = order.product.listingType === 'service';
    if (isServiceOrder) {
      this.notificationService?.notify(
        order.buyerId, 'escrow', 'Service complete', 'Your service session is complete. Funds are being released to the seller.',
      ).catch(() => undefined);
      this.notificationService?.notify(
        sellerId, 'escrow', '🎉 Payment incoming', 'Service marked complete. Your payout is being processed.',
      ).catch(() => undefined);
    } else {
      this.notificationService?.notify(
        order.buyerId, 'escrow', 'Delivery confirmed', 'Thank you! Funds are being released to the seller.',
      ).catch(() => undefined);
      this.notificationService?.notify(
        sellerId, 'escrow', '🎉 Payment incoming', 'The buyer confirmed delivery. Your payout is being processed.',
      ).catch(() => undefined);
    }

    // Only emit RELEASE_PENDING when the payout was not auto-processed to a terminal state.
    // In test mode processPayout already emitted RELEASED; overriding it here would leave
    // the frontend showing the wrong (stale) escrow state until the next page load.
    if (!payoutAutoProcessed) {
      this.chatGateway?.emitOrderUpdated(orderId, {
        escrowStatus: EscrowStatus.RELEASE_PENDING,
        paymentStatus: 'Paid',
      });
    }

    return { message: 'Delivery confirmed. Funds are being released to the seller.' };
  }

  // ─── Paystack webhook (the only trusted payment confirmation source) ───────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.getSecret();
    if (!secret) throw new BadRequestException('Paystack not configured');

    // ── Verify signature ─────────────────────────────────────────────────────
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    if (expected !== signature) throw new UnauthorizedException('Invalid webhook signature');

    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString()) as PaystackWebhookEvent;
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const { event: eventType, data } = event;
    const reference = data.reference ?? '';

    this.logger.log(`Webhook: ${eventType} ref=${reference}`);

    // ── Idempotency check ────────────────────────────────────────────────────
    // Check for ANY existing log (processed or not). A failed prior attempt leaves a
    // processed=false record — creating a new one would throw P2002 (unique [eventType, reference]).
    // Instead, reuse the existing record so the retry can mark it processed on success.
    const existingLog = await this.prisma.webhookLog.findFirst({
      where: { reference, eventType },
    });
    if (existingLog?.processed) {
      this.logger.log(`Webhook duplicate skipped: ${eventType} ${reference}`);
      return { received: true };
    }

    // ── Log the event (or reuse a failed prior attempt) ──────────────────────
    let log: { id: string };
    if (existingLog) {
      // Retry path: a prior delivery failed — reuse the existing log record.
      this.logger.log(`Webhook retry detected: ${eventType} ${reference} (prior attempt failed — retrying)`);
      log = existingLog;
    } else {
      log = await this.prisma.webhookLog.create({
        data: { eventType, reference, payload: rawBody.toString(), verified: true },
      });
    }

    try {
      if (eventType === 'charge.success') {
        await this.handleChargeSuccess(data, reference);
      } else if (eventType === 'transfer.success') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        await this.payoutService.handleTransferSuccess(transferCode, reference);
      } else if (eventType === 'transfer.failed') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        const reason = (data as unknown as { reason?: string }).reason;
        await this.payoutService.handleTransferFailed(transferCode, reference, reason);
      } else if (eventType === 'transfer.reversed') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        const reason = (data as unknown as { reason?: string }).reason;
        await this.payoutService.handleTransferReversed(transferCode, reference, reason);
      } else if (eventType === 'refund.processed' || eventType === 'refund.failed') {
        await this.handleRefund(data);
      }

      await this.prisma.webhookLog.update({ where: { id: log.id }, data: { processed: true } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.webhookLog.update({ where: { id: log.id }, data: { error: msg } });
      this.logger.error(`Webhook processing failed (${eventType}): ${msg}`);
    }

    return { received: true };
  }

  // ─── Admin: list webhook logs ─────────────────────────────────────────────

  async listWebhookLogs(status: 'failed' | 'processed' | 'all' = 'failed', skip = 0, take = 50) {
    const where =
      status === 'failed'   ? { processed: false, error: { not: null as null } } :
      status === 'processed' ? { processed: true } :
      {};
    const [data, total] = await Promise.all([
      this.prisma.webhookLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.webhookLog.count({ where }),
    ]);
    return { data, total, skip, take };
  }

  // ─── Admin: retry a failed webhook ───────────────────────────────────────

  async retryWebhookLog(logId: string): Promise<{ retried: boolean; message: string }> {
    const log = await this.prisma.webhookLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Webhook log not found');
    if (log.processed) {
      return { retried: false, message: 'Already processed — no retry needed' };
    }

    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(log.payload) as PaystackWebhookEvent;
    } catch {
      throw new BadRequestException('Stored payload is not valid JSON — cannot retry');
    }

    const { event: eventType, data } = event;
    const reference = data.reference ?? '';

    try {
      if (eventType === 'charge.success') {
        await this.handleChargeSuccess(data, reference);
      } else if (eventType === 'transfer.success') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        await this.payoutService.handleTransferSuccess(transferCode, reference);
      } else if (eventType === 'transfer.failed') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        const reason = (data as unknown as { reason?: string }).reason;
        await this.payoutService.handleTransferFailed(transferCode, reference, reason);
      } else if (eventType === 'transfer.reversed') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        const reason = (data as unknown as { reason?: string }).reason;
        await this.payoutService.handleTransferReversed(transferCode, reference, reason);
      } else if (eventType === 'refund.processed' || eventType === 'refund.failed') {
        await this.handleRefund(data);
      } else {
        await this.prisma.webhookLog.update({
          where: { id: logId },
          data: { processed: true, error: `No handler for event type: ${eventType}` },
        });
        return { retried: false, message: `No handler registered for event type: ${eventType}` };
      }

      await this.prisma.webhookLog.update({
        where: { id: logId },
        data: { processed: true, error: null },
      });
      this.logger.log(`Webhook log ${logId} retried successfully (${eventType} ${reference})`);
      return { retried: true, message: `Successfully retried ${eventType} for reference ${reference}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.webhookLog.update({
        where: { id: logId },
        data: { error: `[retry] ${msg}` },
      });
      this.logger.error(`Webhook log ${logId} retry failed (${eventType}): ${msg}`);
      throw err;
    }
  }

  // ─── Private: fund escrow after successful charge ─────────────────────────

  private async handleChargeSuccess(
    data: PaystackWebhookEvent['data'],
    reference: string,
  ) {
    const { paid_at, metadata } = data;

    // Subscription payment (no PaymentTransaction record)
    if (metadata?.type === 'subscription' && metadata.userId && metadata.plan) {
      const durationMs = 30 * 24 * 60 * 60 * 1000;
      const userId = metadata.userId as string;
      const plan   = metadata.plan   as string;
      await this.prisma.subscription.upsert({
        where: { userId },
        create: { userId, plan, status: 'active', expiresAt: new Date(Date.now() + durationMs), reference },
        update: { plan, status: 'active', startsAt: new Date(), expiresAt: new Date(Date.now() + durationMs), reference },
      });
      await this.prisma.businessProfile.updateMany({
        where: { userId },
        data: { premium: true },
      });
      this.notificationService?.notify(
        userId, 'subscription', '🎉 Subscription activated!',
        `Your ${plan === 'pro' ? 'Seller Pro' : 'Featured'} plan is now active.`,
      ).catch(() => undefined);
      this.logger.log(`Subscription activated via webhook: ${userId} → ${plan}`);
      return;
    }

    // Order payment
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { reference } });
    if (!payment) {
      this.logger.warn(`charge.success: no payment record for reference ${reference}`);
      return;
    }

    if (payment.status === 'Paid') return; // already funded — idempotent

    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      include: { product: { select: { sellerId: true, title: true } } },
    });
    if (!order) return;

    const sellerId = order.sellerId ?? order.product.sellerId;
    await this.fundEscrow(reference, paid_at ?? new Date().toISOString(), sellerId);
  }

  // ─── Admin: initiate Paystack refund to buyer ────────────────────────────────

  async adminRefundOrder(orderId: string): Promise<{ message: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const terminal = ['REFUNDED', 'FAILED'] as string[];
    if (terminal.includes(order.escrowStatus)) {
      throw new BadRequestException(`Order is already ${order.escrowStatus.toLowerCase()}`);
    }

    const payment = order.payments[0];
    if (!payment || (payment.status !== 'Paid' && payment.status !== 'Refunding')) {
      throw new BadRequestException('No completed payment found for this order');
    }
    if (payment.status === 'Refunding') {
      throw new ConflictException('A refund is already in progress for this order');
    }

    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret) throw new BadRequestException('Paystack not configured');

    // Atomically claim the refund slot: 'Paid' → 'Refunding'.
    // A concurrent caller that also read status='Paid' will get count=0 here and abort.
    const { count: claimed } = await this.prisma.paymentTransaction.updateMany({
      where: { id: payment.id, status: 'Paid' },
      data: { status: 'Refunding' },
    });
    if (claimed === 0) {
      throw new ConflictException('A refund is already in progress for this order');
    }

    try {
      const res = await fetch('https://api.paystack.co/refund', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: payment.reference }),
      });

      const data = (await res.json()) as { status: boolean; message: string };
      if (!data.status) throw new BadRequestException(`Paystack refund failed: ${data.message}`);
    } catch (err) {
      // Paystack call failed — restore status so admin can retry.
      await this.prisma.paymentTransaction.updateMany({
        where: { id: payment.id, status: 'Refunding' },
        data: { status: 'Paid' },
      });
      throw err;
    }

    // Optimistically update order — refund.processed webhook will confirm final state.
    await this.prisma.$transaction(async (tx) => {
      // Re-read current escrowStatus inside the transaction to avoid stale-read race.
      const fresh = await tx.order.findUnique({ where: { id: orderId }, select: { escrowStatus: true } });
      const freshEscrow = fresh?.escrowStatus ?? order.escrowStatus;

      // Always finalize the PaymentTransaction first — 'Refunding' must never be left as a
      // stuck state regardless of whether this caller wins the order claim below.
      await tx.paymentTransaction.updateMany({
        where: { id: payment.id, status: { in: ['Refunding', 'Paid'] } },
        data: { status: 'Refunded', refundedAt: new Date() },
      });

      // Atomic claim: only the first concurrent refund wins the order write.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, escrowStatus: { notIn: ['REFUNDED', 'FAILED'] } },
        data: { escrowStatus: EscrowStatus.REFUNDED, paymentStatus: 'Refunded', status: 'Refunded' },
      });
      if (count === 0) return;

      // Mark platform revenue as reversed — fee was not collected.
      await tx.platformRevenue.updateMany({
        where: { orderId },
        data: { reversedAt: new Date() },
      });

      if (order.sellerId && order.sellerAmount) {
        if (freshEscrow === 'RELEASE_PENDING') {
          await this.walletService.debitAvailable(order.sellerId, order.sellerAmount, tx, undefined);
        } else if (freshEscrow === 'RELEASED') {
          await this.walletService.recordSellerDebt(order.sellerId, order.sellerAmount, tx, orderId);
        } else if (['ESCROW_HELD', 'SHIPPED', 'DELIVERED', 'DISPUTED'].includes(freshEscrow)) {
          await this.walletService.reversePending(order.sellerId, order.sellerAmount, tx, orderId);
        }
      }
    });

    this.chatGateway?.emitOrderUpdated(orderId, { escrowStatus: 'REFUNDED', paymentStatus: 'Refunded' });

    this.logger.log(`Admin triggered refund for order ${orderId}`);
    return { message: 'Refund initiated. Buyer will receive their money back within 5–10 business days.' };
  }

  // ─── Admin: resolve a disputed order ─────────────────────────────────────

  async adminResolveDispute(
    orderId: string,
    decision: 'REFUND_BUYER' | 'RELEASE_SELLER',
    adminId?: string,
  ): Promise<{ message: string }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    this.logger.log(
      `Admin ${adminId ?? 'unknown'} resolving dispute for order ${orderId} — decision: ${decision}`,
    );

    // Atomic claim: transitions DISPUTED → ESCROW_HELD in one conditional update.
    // Two concurrent resolutions cannot both see count > 0 for the same DISPUTED order.
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, escrowStatus: EscrowStatus.DISPUTED },
      data: {
        disputeResolvedAt: new Date(),
        disputeDecision:   decision,
        escrowStatus:      EscrowStatus.ESCROW_HELD,
      },
    });
    if (count === 0) {
      const current = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (current?.escrowStatus !== EscrowStatus.DISPUTED) {
        throw new BadRequestException('This order is not currently under dispute');
      }
      throw new ConflictException('Dispute was already resolved by a concurrent request — refresh and try again');
    }

    if (decision === 'REFUND_BUYER') {
      return this.adminRefundOrder(orderId);
    }

    // RELEASE_SELLER — order is now ESCROW_HELD, releaseEscrowInternal moves it to RELEASE_PENDING.
    await this.releaseEscrowInternal(orderId);

    if (order.buyerId) {
      this.notificationService?.notify(
        order.buyerId, 'dispute', 'Dispute resolved',
        'The dispute has been reviewed. Funds have been released to the seller.',
      ).catch(() => undefined);
    }
    if (order.sellerId) {
      this.notificationService?.notify(
        order.sellerId, 'dispute', 'Dispute resolved in your favour',
        'The admin has reviewed and released the disputed funds to you.',
      ).catch(() => undefined);
    }

    return { message: 'Dispute resolved. Funds released to seller.' };
  }

  // ─── Admin: list all orders with escrow context ───────────────────────────

  async adminListOrders(skip = 0, take = 50, escrowStatus?: string) {
    const where = escrowStatus ? { escrowStatus: escrowStatus as EscrowStatus } : {};
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          product: { select: { id: true, title: true, imageUrl: true, category: true } },
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
          payments: {
            select: { reference: true, status: true, paidAt: true, amount: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          payouts: { select: { id: true, status: true, amount: true, completedAt: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: orders, total, skip, take };
  }

  // ─── Private: handle Paystack refund ────────────────────────────────────────

  private async handleRefund(data: PaystackWebhookEvent['data']) {
    // Paystack puts the original charge reference in transaction_reference
    const originalRef = (data as unknown as { transaction_reference?: string }).transaction_reference
      ?? data.reference;

    const order = await this.prisma.order.findFirst({
      where: { paymentReference: originalRef },
    });

    if (!order) {
      this.logger.warn(`refund webhook: no order found for reference ${originalRef}`);
      return;
    }

    // Quick pre-check (not atomic — the updateMany inside the transaction is the real guard).
    if (['REFUNDED', 'FAILED'].includes(order.escrowStatus)) return;

    await this.prisma.$transaction(async (tx) => {
      // Re-read current escrowStatus inside the transaction to avoid stale-read race.
      // The outer `order` variable may reflect state from before a concurrent transition.
      const fresh = await tx.order.findUnique({ where: { id: order.id }, select: { escrowStatus: true } });
      const freshEscrow = fresh?.escrowStatus ?? order.escrowStatus;

      // Atomic claim: prevents duplicate wallet mutations from concurrent refund events.
      const { count } = await tx.order.updateMany({
        where: { id: order.id, escrowStatus: { notIn: ['REFUNDED', 'FAILED'] } },
        data: {
          escrowStatus:  EscrowStatus.REFUNDED,
          paymentStatus: 'Refunded',
          status:        'Refunded',
        },
      });
      if (count === 0) return; // concurrent call already transitioned — skip wallet mutations

      // Finalize the PaymentTransaction — may be 'Refunding' if adminRefundOrder's Paystack
      // call succeeded but its own transaction hasn't committed yet (crash or race window).
      await tx.paymentTransaction.updateMany({
        where: { orderId: order.id, status: { in: ['Refunding', 'Paid'] } },
        data: { status: 'Refunded', refundedAt: new Date() },
      });

      // Reverse wallet balance based on where funds actually sat at transaction time.
      if (order.sellerId && order.sellerAmount) {
        if (freshEscrow === 'RELEASE_PENDING') {
          await this.walletService.debitAvailable(order.sellerId, order.sellerAmount, tx);
        } else if (freshEscrow === 'RELEASED') {
          await this.walletService.recordSellerDebt(order.sellerId, order.sellerAmount, tx, order.id);
        } else {
          await this.walletService.reversePending(order.sellerId, order.sellerAmount, tx);
        }
      }
    });

    this.logger.log(`Refund processed: order ${order.id} → REFUNDED`);
    this.chatGateway?.emitOrderUpdated(order.id, { escrowStatus: 'REFUNDED', paymentStatus: 'Refunded' });
  }

  // ─── Admin: reconcile COMPLETED service bookings with stale escrow ──────────

  async reconcileServiceBookings(): Promise<{
    checked: number;
    fixed: number;
    skipped: Array<{ bookingId: string; orderId: string; reason: string }>;
    details: Array<{ bookingId: string; orderId: string; action: string }>;
  }> {
    // Find service bookings that reached COMPLETED while their order is still non-terminal.
    // This happens when the hairdressing-incident guard was not yet in place, or when
    // releaseEscrowInternal threw after the booking was marked COMPLETED.
    const stuckBookings = await this.prisma.serviceBooking.findMany({
      where: {
        status: 'COMPLETED',
        orderId: { not: null },
        order: { escrowStatus: { notIn: ['RELEASED', 'REFUNDED', 'FAILED'] } },
      },
      include: {
        order: {
          include: {
            payouts: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    let fixed = 0;
    const skipped: Array<{ bookingId: string; orderId: string; reason: string }> = [];
    const details: Array<{ bookingId: string; orderId: string; action: string }> = [];

    for (const booking of stuckBookings) {
      const order = booking.order!;
      const orderId = booking.orderId!;
      const escrow = order.escrowStatus;
      const payout = order.payouts[0] ?? null;

      try {
        if (['ESCROW_HELD', 'SHIPPED', 'DELIVERED'].includes(escrow)) {
          // Release never ran. pendingBalance still holds the funds — safe to release.
          await this.releaseEscrowInternal(orderId);
          details.push({ bookingId: booking.id, orderId, action: `Released from ${escrow}` });
          fixed++;
        } else if (escrow === 'RELEASE_PENDING') {
          if (!payout) {
            skipped.push({ bookingId: booking.id, orderId, reason: 'RELEASE_PENDING but no payout record — manual review needed' });
            continue;
          }

          if (payout.status === 'COMPLETED' || payout.status === 'REVERSED') {
            // Financial ops already happened. State-only patch — no balance changes.
            const { count } = await this.prisma.order.updateMany({
              where: { id: orderId, escrowStatus: 'RELEASE_PENDING' },
              data: { escrowStatus: 'RELEASED', status: 'Completed' },
            });
            if (count > 0) {
              details.push({ bookingId: booking.id, orderId, action: `State-patched RELEASE_PENDING → RELEASED (payout ${payout.id} was ${payout.status})` });
              fixed++;
            } else {
              skipped.push({ bookingId: booking.id, orderId, reason: 'State-patch was a no-op — order may have moved concurrently' });
            }
          } else if (['PENDING', 'APPROVED'].includes(payout.status)) {
            // availableBalance already credited by pendingToAvailable in the release tx.
            // Process the existing payout — debitAvailable will move it out correctly.
            await this.payoutService.processPayout(payout.id);
            details.push({ bookingId: booking.id, orderId, action: `Processed ${payout.status} payout ${payout.id}` });
            fixed++;
          } else if (payout.status === 'FAILED') {
            // Payout failed and debit was restored by refundAvailable.
            // availableBalance holds the funds again — reset payout to PENDING and re-process.
            await this.prisma.payout.update({
              where: { id: payout.id },
              data: { status: PayoutStatus.PENDING, failureReason: null, transferCode: null },
            });
            await this.payoutService.processPayout(payout.id);
            details.push({ bookingId: booking.id, orderId, action: `Reset FAILED payout ${payout.id} to PENDING and re-processed` });
            fixed++;
          } else {
            // PROCESSING / TRANSFER_UNKNOWN / CANCELLED — do not touch; webhook or admin should handle.
            skipped.push({ bookingId: booking.id, orderId, reason: `Payout ${payout.id} is ${payout.status} — manual review needed` });
          }
        } else if (escrow === 'DISPUTED') {
          skipped.push({ bookingId: booking.id, orderId, reason: 'Order is DISPUTED — resolve dispute before reconciling' });
        } else {
          skipped.push({ bookingId: booking.id, orderId, reason: `Unhandled escrowStatus ${escrow}` });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        skipped.push({ bookingId: booking.id, orderId, reason: `Error: ${msg}` });
        this.logger.error(`reconcileServiceBookings: booking ${booking.id} (order ${orderId}) failed: ${msg}`);
      }
    }

    this.logger.log(`reconcileServiceBookings complete — checked=${stuckBookings.length} fixed=${fixed} skipped=${skipped.length}`);
    return { checked: stuckBookings.length, fixed, skipped, details };
  }

  /**
   * Core escrow funding logic.
   * Called from: verify(), checkMomoStatus(), handleChargeSuccess().
   * Idempotent: checks payment.status before acting.
   */
  private async fundEscrow(reference: string, paidAt: string, sellerId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'Paid') return payment; // already done

    const order = payment.order;

    // Check for a linked service booking BEFORE the transaction so we can:
    // 1. Skip delivery code generation for service orders
    // 2. Auto-confirm the booking after escrow is funded
    const linkedBooking = await this.prisma.serviceBooking.findUnique({
      where:  { orderId: order.id },
      select: { id: true, buyerId: true, sellerId: true, status: true },
    });
    const isServiceOrder = !!linkedBooking;

    // Use the financial values that were locked in when this order was created.
    // Commission is calculated once at order/booking creation and stored permanently.
    // Reading live fee config here would silently alter the financial terms of an
    // existing order if the configuration changed after the order was placed.
    //
    // Legacy path: orders created before commission-field storage have totalAmount = 0.
    // For those orders only, calculate once from current config and store permanently.
    // Modern orders (totalAmount > 0) always use their stored values unchanged.
    let escrowTotal:   number;
    let escrowFee:     number;
    let escrowSeller:  number;
    let revFeePercent: number;
    let revFeeFixed:   number;

    if (order.totalAmount > 0) {
      escrowTotal   = order.totalAmount;
      escrowFee     = order.platformFee;
      escrowSeller  = order.sellerAmount > 0 ? order.sellerAmount : order.price;
      // Derive feePercent from stored amounts for the PlatformRevenue record.
      revFeePercent = order.price > 0 ? (order.platformFee / order.price) * 100 : 0;
      revFeeFixed   = 0;
    } else {
      // Legacy order: commission was not stored at creation time. Calculate once.
      this.logger.warn(`fundEscrow: order ${order.id} has no stored commission (legacy) — calculating from current config`);
      const { feePercent, feeFixed } = this.getFeeConfig();
      const c = calculateCommission(order.price, feePercent, feeFixed);
      escrowTotal   = c.totalAmount;
      escrowFee     = c.platformFee;
      escrowSeller  = c.sellerAmount;
      revFeePercent = c.feePercent;
      revFeeFixed   = c.feeFixed;
    }

    let funded = false;
    await this.prisma.$transaction(async (tx) => {
      // 1. Mark payment as paid — conditional updateMany is the atomic idempotency guard.
      //    Two concurrent charge.success / verify calls cannot both fund escrow:
      //    the second sees count=0 (status already 'Paid') and aborts without double-crediting.
      const { count } = await tx.paymentTransaction.updateMany({
        where: { reference, status: { not: 'Paid' } },
        data: { status: 'Paid', paidAt: new Date(paidAt), verifiedAt: new Date() },
      });
      if (count === 0) return; // already funded by a concurrent call — skip

      funded = true;

      // 2. Update order: ESCROW_HELD + financial fields
      //    Delivery code is only relevant for product orders — service orders use the
      //    booking completion flow instead.
      const codeFields = isServiceOrder ? {} : {
        deliveryCode:        generateVerificationCode(),
        deliveryCodeExpires: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h
      };
      await tx.order.update({
        where: { id: order.id },
        data: {
          escrowStatus:     EscrowStatus.ESCROW_HELD,
          status:           escrowToStatus(EscrowStatus.ESCROW_HELD),
          paymentStatus:    'Paid',
          paymentReference: reference,
          totalAmount:      escrowTotal,
          platformFee:      escrowFee,
          sellerAmount:     escrowSeller,
          sellerId,
          ...codeFields,
        },
      });

      // 3. Credit seller pending balance
      await this.walletService.creditPending(sellerId, escrowSeller, tx);

      // 4. Record platform revenue (upsert — safe if webhook fires twice)
      await tx.platformRevenue.upsert({
        where: { orderId: order.id },
        create: {
          orderId:      order.id,
          feeAmount:    escrowFee,
          feePercent:   revFeePercent,
          feeFixed:     revFeeFixed,
          totalAmount:  escrowTotal,
          sellerAmount: escrowSeller,
        },
        update: {},
      });
    });

    if (!funded) return payment; // concurrent call already funded — idempotent no-op

    // 5. Notify buyer + seller
    const releaseNote = isServiceOrder
      ? `GHS ${escrowSeller.toFixed(2)} will be released to the seller once the service is complete.`
      : `Payment for your listing is held in escrow (GHS ${escrowSeller.toFixed(2)} coming to you after delivery confirmation).`;

    this.notificationService?.notify(
      payment.userId, 'payment', '✅ Payment confirmed',
      `GHS ${escrowTotal.toFixed(2)} is held in escrow. The seller has been notified.`,
    ).catch(() => undefined);
    this.notificationService?.notify(
      sellerId, 'payment', '🔒 Payment received',
      releaseNote,
    ).catch(() => undefined);

    this.logger.log(
      `Escrow funded: order=${order.id} total=${escrowTotal} fee=${escrowFee} seller=${escrowSeller}`,
    );

    // Push real-time update to anyone watching this order
    this.chatGateway?.emitOrderUpdated(order.id, {
      escrowStatus:  EscrowStatus.ESCROW_HELD,
      paymentStatus: 'Paid',
    });

    // Auto-confirm the linked service booking
    if (linkedBooking && linkedBooking.status === 'ACCEPTED') {
      await this.prisma.serviceBooking.update({
        where: { id: linkedBooking.id },
        data:  { status: 'CONFIRMED' },
      });
      this.notificationService?.notify(
        linkedBooking.sellerId, 'booking', 'Booking confirmed',
        'Payment received — your service booking is now confirmed.',
      ).catch(() => undefined);
      this.notificationService?.notify(
        linkedBooking.buyerId, 'booking', 'Booking confirmed',
        'Your payment was received. Your booking is confirmed!',
      ).catch(() => undefined);
    }

    return this.prisma.paymentTransaction.findUnique({ where: { reference } });
  }
}
