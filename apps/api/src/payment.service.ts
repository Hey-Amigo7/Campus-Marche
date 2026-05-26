import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscrowStatus, PayoutMethod } from '@prisma/client';
import { calculateCommission, escrowToStatus, isEscrowPaid } from './commission.engine';
import type { NotificationService } from './notification.service';
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
  ) {}

  private getSecret() {
    return this.config.get<string>('PAYSTACK_SECRET_KEY')?.trim();
  }

  private getFeeConfig() {
    return {
      feePercent: parseFloat(this.config.get<string>('MARKETPLACE_FEE_PERCENT') ?? '1'),
      feeFixed:   parseFloat(this.config.get<string>('MARKETPLACE_FEE_FLAT')    ?? '0'),
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

    if (!secret) {
      // Dev mode: log and return placeholder
      this.logger.warn('PAYSTACK_SECRET_KEY not configured — returning dev placeholder');
      const tx = await this.prisma.paymentTransaction.create({
        data: { orderId: order.id, userId, reference, amount: order.totalAmount || order.price, status: 'Dev mode — Paystack not configured' },
      });
      await this.prisma.order.update({
        where: { id: orderId },
        data: { escrowStatus: EscrowStatus.PAYMENT_INITIALIZED },
      });
      return tx;
    }

    const amountInPesewas = Math.round((order.totalAmount || order.price) * 100);

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.buyer.email,
        amount: amountInPesewas,
        currency: 'GHS',
        reference,
        callback_url: this.config.get<string>('PAYSTACK_CALLBACK_URL') ?? 'http://localhost:3000/orders',
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
    const amountInPesewas = Math.round((order.totalAmount || order.price) * 100);
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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            sellerId: true,
            seller: { select: { name: true, business: { select: { momoProvider: true, momoPhone: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException('Only the buyer can confirm delivery');
    if (order.escrowStatus !== EscrowStatus.ESCROW_HELD) {
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

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          escrowStatus: EscrowStatus.RELEASE_PENDING,
          status: 'Releasing funds',
          deliveryConfirmedAt: new Date(),
        },
      });

      // Move seller balance: pending → available
      await this.walletService.pendingToAvailable(sellerId, sellerAmount, tx);
    });

    // Create payout outside the main transaction (triggers Paystack if auto-approve on)
    await this.payoutService.createEscrowPayout(sellerId, orderId, sellerAmount, payoutMethod, momoPhone);

    this.notificationService?.notify(
      userId, 'escrow', 'Delivery confirmed', 'Thank you! Funds are being released to the seller.',
    ).catch(() => undefined);
    this.notificationService?.notify(
      sellerId, 'escrow', '🎉 Payment incoming', 'The buyer confirmed delivery. Your payout is being processed.',
    ).catch(() => undefined);

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
    const existing = await this.prisma.webhookLog.findFirst({
      where: { reference, eventType, processed: true },
    });
    if (existing) {
      this.logger.log(`Webhook duplicate skipped: ${eventType} ${reference}`);
      return { received: true };
    }

    // ── Log the event ────────────────────────────────────────────────────────
    const log = await this.prisma.webhookLog.create({
      data: { eventType, reference, payload: rawBody.toString(), verified: true },
    });

    try {
      if (eventType === 'charge.success') {
        await this.handleChargeSuccess(data, reference);
      } else if (eventType === 'transfer.success') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        await this.payoutService.handleTransferSuccess(transferCode, reference);
      } else if (eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
        const transferCode = (data as unknown as { transfer_code?: string }).transfer_code ?? '';
        const reason = (data as unknown as { reason?: string }).reason;
        await this.payoutService.handleTransferFailed(transferCode, reference, reason);
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

    // Already in a terminal refund/failed state — skip
    if (['REFUNDED', 'FAILED'].includes(order.escrowStatus)) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          escrowStatus:  EscrowStatus.REFUNDED,
          paymentStatus: 'Refunded',
          status:        'Refunded',
        },
      });

      // Reverse wallet balance — pending if funds not yet released, available if buyer already confirmed
      if (order.sellerId && order.sellerAmount) {
        const inAvailable = ['RELEASE_PENDING', 'DELIVERED'].includes(order.escrowStatus);
        if (inAvailable) {
          await this.walletService.refundAvailable(order.sellerId, order.sellerAmount, tx);
        } else {
          await this.walletService.reversePending(order.sellerId, order.sellerAmount, tx);
        }
      }
    });

    this.logger.log(`Refund processed: order ${order.id} → REFUNDED`);
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
    const { feePercent, feeFixed } = this.getFeeConfig();
    const commission = calculateCommission(order.totalAmount || order.price, feePercent, feeFixed);

    await this.prisma.$transaction(async (tx) => {
      // 1. Mark payment as paid
      await tx.paymentTransaction.update({
        where: { reference },
        data: { status: 'Paid', paidAt: new Date(paidAt), verifiedAt: new Date() },
      });

      // 2. Update order: ESCROW_HELD + financial fields
      await tx.order.update({
        where: { id: order.id },
        data: {
          escrowStatus:     EscrowStatus.ESCROW_HELD,
          status:           escrowToStatus(EscrowStatus.ESCROW_HELD),
          paymentStatus:    'Paid',
          paymentReference: reference,
          totalAmount:      commission.totalAmount,
          platformFee:      commission.platformFee,
          sellerAmount:     commission.sellerAmount,
          sellerId:         sellerId,
        },
      });

      // 3. Credit seller pending balance
      await this.walletService.creditPending(sellerId, commission.sellerAmount, tx);

      // 4. Record platform revenue (upsert — safe if webhook fires twice)
      await tx.platformRevenue.upsert({
        where: { orderId: order.id },
        create: {
          orderId:      order.id,
          feeAmount:    commission.platformFee,
          feePercent:   commission.feePercent,
          feeFixed:     commission.feeFixed,
          totalAmount:  commission.totalAmount,
          sellerAmount: commission.sellerAmount,
        },
        update: {},
      });
    });

    // 5. Notify buyer + seller
    this.notificationService?.notify(
      payment.userId, 'payment', '✅ Payment confirmed',
      `GHS ${commission.totalAmount.toFixed(2)} is held in escrow. The seller has been notified.`,
    ).catch(() => undefined);
    this.notificationService?.notify(
      sellerId, 'payment', '🔒 Payment received',
      `Payment for your listing is held in escrow (GHS ${commission.sellerAmount.toFixed(2)} coming to you after delivery confirmation).`,
    ).catch(() => undefined);

    this.logger.log(
      `Escrow funded: order=${order.id} total=${commission.totalAmount} fee=${commission.platformFee} seller=${commission.sellerAmount}`,
    );

    return this.prisma.paymentTransaction.findUnique({ where: { reference } });
  }
}
