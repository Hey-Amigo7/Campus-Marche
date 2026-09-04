import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutMethod, PayoutStatus, UserRole } from '@prisma/client';
import { MOMO_BANK_CODES } from './commission.engine';
import type { ChatGateway } from './chat.gateway';
import type { NotificationService } from './notification.service';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';

type PaystackTransferRecipientResponse = {
  status: boolean;
  message: string;
  data?: { recipient_code: string; type: string };
};

type PaystackTransferResponse = {
  status: boolean;
  message: string;
  data?: { transfer_code: string; reference: string; status: string };
};

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private walletService: WalletService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private chatGateway?: ChatGateway,
  ) {}

  private getSecret() {
    return this.config.get<string>('PAYSTACK_SECRET_KEY')?.trim();
  }

  // ─── Seller payout request ─────────────────────────────────────────────────

  async requestPayout(sellerId: string, amount: number, payoutMethod: PayoutMethod, momoPhone?: string) {
    const wallet = await this.walletService.getBalance(sellerId);
    if (wallet.availableBalance < amount) {
      throw new BadRequestException(
        `Available balance (GHS ${wallet.availableBalance.toFixed(2)}) is less than requested amount (GHS ${amount.toFixed(2)})`,
      );
    }

    // Get MoMo phone from business profile if not provided
    if (!momoPhone && payoutMethod !== 'BANK_TRANSFER') {
      const business = await this.prisma.businessProfile.findUnique({ where: { userId: sellerId } });
      momoPhone = business?.momoPhone ?? undefined;
    }

    if (!momoPhone && payoutMethod !== 'BANK_TRANSFER') {
      throw new BadRequestException('No MoMo phone on file. Please add your Mobile Money number in your business profile or provide one in the request.');
    }

    let payout: Awaited<ReturnType<typeof this.prisma.payout.create>>;
    try {
      payout = await this.prisma.payout.create({
        data: { sellerId, amount, payoutMethod },
      });
    } catch (err) {
      this.logger.error(`Failed to create payout record for seller ${sellerId}: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('Could not create payout request. Please try again.');
    }

    const autoApprove = this.config.get<string>('PAYOUT_AUTO_APPROVE') !== 'false';
    if (autoApprove) {
      try {
        await this.processPayout(payout.id, momoPhone);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Auto-process payout ${payout.id} failed: ${msg}`);
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { failureReason: msg },
        }).catch(() => null);
      }
    } else {
      // Manual approval mode — notify all admins so they know to act
      await this.notifyAdmins(
        'payout',
        '⏳ Payout request pending',
        `A seller requested a payout of GHS ${amount.toFixed(2)} (${payoutMethod.replace(/_/g, ' ')}). Please review in the admin panel.`,
      );
    }

    return this.prisma.payout.findUnique({ where: { id: payout.id } });
  }

  // ─── Payout created automatically from escrow release ─────────────────────

  async createEscrowPayout(
    sellerId: string,
    orderId: string,
    amount: number,
    payoutMethod: PayoutMethod,
    momoPhone?: string,
  ) {
    let payout: Awaited<ReturnType<typeof this.prisma.payout.create>>;
    try {
      payout = await this.prisma.payout.create({
        data: { sellerId, orderId, amount, payoutMethod },
      });
    } catch (err) {
      this.logger.error(`Failed to create escrow payout for order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('Could not create escrow payout record.');
    }

    const autoApprove = this.config.get<string>('PAYOUT_AUTO_APPROVE') !== 'false';
    if (autoApprove) {
      try {
        await this.processPayout(payout.id, momoPhone);
      } catch (err) {
        this.logger.error(`Auto-process escrow payout ${payout.id} failed: ${String(err)}`);
        await this.prisma.payout.update({
          where: { id: payout.id },
          data: { failureReason: err instanceof Error ? err.message : String(err) },
        }).catch(() => null);
      }
    } else {
      // Manual approval mode — notify all admins of the pending escrow payout
      await this.notifyAdmins(
        'payout',
        '⏳ Escrow payout pending approval',
        `Buyer confirmed delivery. Seller payout of GHS ${amount.toFixed(2)} is awaiting your approval in the admin panel.`,
      );
    }

    return payout;
  }

  // ─── Process (initiate Paystack transfer) ─────────────────────────────────

  async processPayout(payoutId: string, momoPhone?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { seller: { include: { business: true } } },
    });

    if (!payout) throw new NotFoundException('Payout not found');
    if (!([PayoutStatus.PENDING, PayoutStatus.APPROVED] as PayoutStatus[]).includes(payout.status)) {
      throw new BadRequestException(`Cannot process payout with status ${payout.status}`);
    }

    const secret = this.getSecret();
    if (!secret) {
      this.logger.warn(`Payout ${payoutId}: PAYSTACK_SECRET_KEY not configured — marking PENDING`);
      return;
    }

    // ── Test-mode bypass: skip ALL Paystack API calls to avoid "starter business" error ──
    // Recipient creation also hits Paystack and would appear as pending in dashboard.
    if (secret.startsWith('sk_test_')) {
      const testRef  = `TEST-CM-PAYOUT-${payoutId.slice(-8)}-${Date.now()}`;
      const testCode = `TEST_TRANSFER_${payoutId.slice(-8)}`;

      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.COMPLETED,
            transferCode: testCode,
            transferReference: testRef,
            processedAt: new Date(),
            completedAt: new Date(),
          },
        });

        await this.walletService.debitAvailable(payout.sellerId, payout.amount, tx);
        await this.walletService.finalizeWithdrawal(payout.sellerId, payout.amount, tx);

        if (payout.orderId) {
          await tx.order.updateMany({
            where: { id: payout.orderId, escrowStatus: 'RELEASE_PENDING' },
            data: { escrowStatus: 'RELEASED', status: 'Completed' },
          });
        }
      });

      if (payout.orderId) {
        this.chatGateway?.emitOrderUpdated(payout.orderId, { escrowStatus: 'RELEASED', paymentStatus: 'Paid' });
      }

      this.notificationService?.notify(
        payout.sellerId,
        'payout',
        'Payout sent (test mode)',
        `GHS ${payout.amount.toFixed(2)} simulated — no real transfer in Paystack test mode.`,
      ).catch(() => undefined);

      this.logger.log(`[TEST MODE] Payout ${payoutId} simulated as COMPLETED — GHS ${payout.amount}`);
      return;
    }

    // ── Live mode: real Paystack calls below ───────────────────────────────

    // Determine MoMo phone
    const phone = momoPhone ?? payout.seller.business?.momoPhone;
    if (!phone && payout.payoutMethod !== 'BANK_TRANSFER') {
      throw new BadRequestException('Seller has no MoMo phone on file');
    }

    const bankCode = MOMO_BANK_CODES[payout.payoutMethod];

    // ── Step 1: Get or create transfer recipient ────────────────────────────
    const recipientCode = await this.getOrCreateRecipient(
      secret,
      payout.sellerId,
      payout.seller.name,
      phone!,
      bankCode,
      payout.payoutMethod,
    );

    // ── Step 2: Debit seller available balance ─────────────────────────────
    await this.walletService.debitAvailable(payout.sellerId, payout.amount);

    // ── Step 3: Initiate Paystack transfer ─────────────────────────────────
    const reference = `CM-PAYOUT-${payoutId.slice(-8)}-${Date.now()}`;
    const amountInPesewas = Math.round(payout.amount * 100);

    const transferRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'balance',
        amount: amountInPesewas,
        recipient: recipientCode,
        reference,
        reason: `Campus Marche seller payout${payout.orderId ? ` — order ${payout.orderId.slice(0, 8)}` : ''}`,
      }),
    });

    const transferData = (await transferRes.json()) as PaystackTransferResponse;

    if (!transferData.status || !transferData.data) {
      // Refund the debited balance
      await this.walletService.refundAvailable(payout.sellerId, payout.amount);
      throw new BadRequestException(`Paystack transfer failed: ${transferData.message}`);
    }

    // ── Step 4: Update payout record ───────────────────────────────────────
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PROCESSING,
        transferCode: transferData.data.transfer_code,
        transferReference: transferData.data.reference,
        recipientCode,
        processedAt: new Date(),
      },
    });

    this.logger.log(
      `Payout ${payoutId} processing — transfer_code: ${transferData.data.transfer_code}`,
    );

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout initiated',
      `GHS ${payout.amount.toFixed(2)} is on its way to your ${payout.payoutMethod.replace(/_/g, ' ')}.`,
    ).catch(() => undefined);
  }

  // ─── Webhook: transfer.success ─────────────────────────────────────────────

  async handleTransferSuccess(transferCode: string, reference: string) {
    const payout = await this.prisma.payout.findFirst({
      where: {
        OR: [{ transferCode }, { transferReference: reference }],
        status: PayoutStatus.PROCESSING,
      },
    });

    if (!payout) {
      this.logger.warn(`transfer.success: no PROCESSING payout found for code=${transferCode} ref=${reference}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.COMPLETED, completedAt: new Date() },
      });

      await this.walletService.finalizeWithdrawal(payout.sellerId, payout.amount, tx);

      // Mark the linked order RELEASED if it was RELEASE_PENDING
      if (payout.orderId) {
        await tx.order.updateMany({
          where: { id: payout.orderId, escrowStatus: 'RELEASE_PENDING' },
          data: { escrowStatus: 'RELEASED', status: 'Completed' },
        });
      }
    });

    // Push real-time update so the order detail page ticks the final step green
    if (payout.orderId) {
      this.chatGateway?.emitOrderUpdated(payout.orderId, {
        escrowStatus: 'RELEASED',
        paymentStatus: 'Paid',
      });
    }

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      '💰 Payout completed',
      `GHS ${payout.amount.toFixed(2)} has been sent to your account.`,
    ).catch(() => undefined);

    this.logger.log(`Payout ${payout.id} COMPLETED — GHS ${payout.amount}`);
  }

  // ─── Webhook: transfer.failed / transfer.reversed ─────────────────────────

  async handleTransferFailed(transferCode: string, reference: string, reason?: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { OR: [{ transferCode }, { transferReference: reference }] },
    });

    if (!payout) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.FAILED, failureReason: reason ?? 'Transfer failed' },
      });
      // Refund the available balance since the transfer didn't go through
      await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx);
    });

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout failed',
      `Your payout of GHS ${payout.amount.toFixed(2)} failed. Your balance has been restored. Please contact support.`,
    ).catch(() => undefined);

    this.logger.error(`Payout ${payout.id} FAILED: ${reason ?? 'unknown'}`);
  }

  // ─── Admin: list pending payouts ───────────────────────────────────────────

  async listPayouts(status?: PayoutStatus, skip = 0, take = 50) {
    const where = status ? { status } : {};
    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          order: {
            select: {
              id: true,
              status: true,
              escrowStatus: true,
              price: true,
              totalAmount: true,
              platformFee: true,
              sellerAmount: true,
              paymentReference: true,
              deliveryConfirmedAt: true,
              createdAt: true,
              product: { select: { id: true, title: true, imageUrl: true, category: true } },
              buyer: { select: { id: true, name: true, email: true } },
              payments: {
                select: { reference: true, status: true, paidAt: true, amount: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { data: payouts, total, skip, take };
  }

  // ─── Seller: own payout history ────────────────────────────────────────────

  async getSellerPayouts(sellerId: string) {
    return this.prisma.payout.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ─── Admin: manually approve + process a pending payout ───────────────────

  async adminApprovePayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Cannot approve payout with status ${payout.status}`);
    }

    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: PayoutStatus.APPROVED, approvedAt: new Date() },
    });

    try {
      await this.processPayout(payoutId);
    } catch (err) {
      // Roll back to PENDING so admin can investigate and retry
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.PENDING,
          approvedAt: null,
          failureReason: err instanceof Error ? err.message : String(err),
        },
      }).catch(() => null);
      throw err;
    }

    return this.prisma.payout.findUnique({ where: { id: payoutId } });
  }

  // ─── Admin: cancel/void a payout and restore seller balance ──────────────

  async adminCancelPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');

    const cancellable: PayoutStatus[] = [PayoutStatus.PENDING, PayoutStatus.PROCESSING];
    if (!cancellable.includes(payout.status)) {
      throw new ForbiddenException(`Cannot cancel a payout with status ${payout.status}`);
    }

    // PROCESSING means availableBalance was already debited — restore it
    const needsRefund = payout.status === PayoutStatus.PROCESSING;

    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.CANCELLED,
          failureReason: 'Cancelled by admin — balance restored',
        },
      });
      if (needsRefund) {
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx);
      }
    });

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout voided',
      `Your payout of GHS ${payout.amount.toFixed(2)} was cancelled and your balance has been restored.`,
    ).catch(() => undefined);

    return { message: needsRefund ? 'Payout cancelled and balance restored.' : 'Payout cancelled.' };
  }

  // ─── Admin: manually void + refund a stuck PROCESSING payout ─────────────

  async adminRefundPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PROCESSING) {
      throw new BadRequestException(`Only PROCESSING payouts can be refunded this way — current status: ${payout.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.FAILED,
          failureReason: 'Manually voided by admin — OTP-blocked transfer refunded',
        },
      });
      await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx);
    });

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout refunded',
      `Your payout of GHS ${payout.amount.toFixed(2)} could not be completed and your balance has been restored. Please request a new payout.`,
    ).catch(() => undefined);

    this.logger.log(`Payout ${payoutId} manually refunded by admin — GHS ${payout.amount}`);
    return { message: 'Payout voided and balance restored to seller.' };
  }

  // ─── Private: broadcast to all admin users ────────────────────────────────

  private async notifyAdmins(type: string, title: string, body: string) {
    if (!this.notificationService) return;
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      await Promise.all(admins.map((a) => this.notificationService!.notify(a.id, type, title, body)));
    } catch (err) {
      this.logger.warn(`Failed to notify admins: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── Private: get or create Paystack transfer recipient ───────────────────

  private async getOrCreateRecipient(
    secret: string,
    sellerId: string,
    sellerName: string,
    phone: string,
    bankCode: string,
    network: PayoutMethod,
  ): Promise<string> {
    const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '233');

    // Check cache — include inactive records so we don't try to re-create a code Paystack already issued
    const existing = await this.prisma.transferRecipient.findFirst({
      where: { sellerId, momoPhone: normalizedPhone },
    });
    if (existing) return existing.recipientCode;

    // Create new recipient via Paystack
    const res = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'mobile_money',
        name: sellerName,
        account_number: normalizedPhone,
        bank_code: bankCode,
        currency: 'GHS',
      }),
    });

    const data = (await res.json()) as PaystackTransferRecipientResponse;
    if (!data.status || !data.data) {
      throw new BadRequestException(`Could not create transfer recipient: ${data.message}`);
    }

    const recipientCode = data.data.recipient_code;

    // Upsert so a duplicate recipientCode (Paystack deduplicates on their end) never crashes
    await this.prisma.transferRecipient.upsert({
      where: { recipientCode },
      create: {
        sellerId,
        recipientCode,
        type: 'mobile_money',
        momoPhone: normalizedPhone,
        momoNetwork: network,
      },
      update: { sellerId, momoPhone: normalizedPhone, momoNetwork: network, active: true },
    });

    return recipientCode;
  }
}
