import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutMethod, PayoutStatus } from '@prisma/client';
import { MOMO_BANK_CODES } from './commission.engine';
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

    const payout = await this.prisma.payout.create({
      data: { sellerId, amount, payoutMethod },
    });

    const autoApprove = this.config.get<string>('PAYOUT_AUTO_APPROVE') !== 'false';
    if (autoApprove) {
      try {
        await this.processPayout(payout.id, momoPhone);
      } catch (err) {
        this.logger.error(`Auto-process payout ${payout.id} failed: ${String(err)}`);
        // Payout remains PENDING — admin can retry
      }
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
    const payout = await this.prisma.payout.create({
      data: { sellerId, orderId, amount, payoutMethod },
    });

    const autoApprove = this.config.get<string>('PAYOUT_AUTO_APPROVE') !== 'false';
    if (autoApprove) {
      try {
        await this.processPayout(payout.id, momoPhone);
      } catch (err) {
        this.logger.error(`Auto-process escrow payout ${payout.id} failed: ${String(err)}`);
      }
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

  async listPayouts(status?: PayoutStatus, skip = 0, take = 20) {
    const where = status ? { status } : {};
    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: { seller: { select: { id: true, name: true, email: true } } },
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

    await this.processPayout(payoutId);
    return this.prisma.payout.findUnique({ where: { id: payoutId } });
  }

  // ─── Admin: cancel pending payout ─────────────────────────────────────────

  async adminCancelPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new ForbiddenException('Only PENDING payouts can be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: { status: PayoutStatus.CANCELLED },
      });
      // Restore available balance (it was moved from pending → available on delivery confirmation)
      await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx);
      // Also restore pending balance (we move pending → available on release, so reversal needs care)
      // In practice: cancel before the payout fires is OK; just refund available
    });

    return { message: 'Payout cancelled and balance restored.' };
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

    // Check cached recipient for this seller+phone combo
    const existing = await this.prisma.transferRecipient.findFirst({
      where: { sellerId, momoPhone: normalizedPhone, active: true },
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

    // Cache it
    await this.prisma.transferRecipient.create({
      data: {
        sellerId,
        recipientCode,
        type: 'mobile_money',
        momoPhone: normalizedPhone,
        momoNetwork: network,
      },
    });

    return recipientCode;
  }
}
