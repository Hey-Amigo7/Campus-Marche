import {
  BadRequestException,
  ConflictException,
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

    const secret = this.getSecret();
    if (!secret) {
      this.logger.warn(`Payout ${payoutId}: PAYSTACK_SECRET_KEY not configured — skipping`);
      return;
    }

    // Deterministic reference: identical on every retry so Paystack deduplicates,
    // and so transfer.success/failed webhooks can locate this payout by reference
    // even if the server crashes between the Paystack call and storing transferCode.
    const reference = `CM-PAYOUT-${payoutId}`;

    // Atomic concurrency lock + wallet debit in one DB transaction.
    // updateMany WHERE status IN (PENDING, APPROVED) returns count = 0 if another
    // concurrent call already claimed this payout — we abort without touching Paystack.
    // Debit is inside the same transaction so the lock and balance change are atomic:
    // the seller cannot double-spend while the transfer is in-flight.
    // If debitAvailable throws (e.g. race-depleted balance), the updateMany rolls back
    // and the payout stays in its previous state.
    let claimed = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payout.updateMany({
        where: { id: payoutId, status: { in: [PayoutStatus.PENDING, PayoutStatus.APPROVED] } },
        data: { status: PayoutStatus.PROCESSING, transferReference: reference },
      });
      if (count === 0) return;
      claimed = true;
      await this.walletService.debitAvailable(payout.sellerId, payout.amount, tx, payoutId);
    });

    if (!claimed) {
      this.logger.warn(`Payout ${payoutId}: concurrent call already claimed this payout — aborting`);
      return;
    }

    // ── Test-mode bypass ─────────────────────────────────────────────────────────
    // Skips recipient creation and transfer initiation to avoid "starter business"
    // restrictions on Paystack test accounts. Goes straight to COMPLETED and runs
    // finalizeWithdrawal (debitAvailable already ran in the lock step above).
    // Do NOT change this bypass path.
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

    // ── Live mode: real Paystack calls below ─────────────────────────────────────

    const phone = momoPhone ?? payout.seller.business?.momoPhone;
    if (!phone && payout.payoutMethod !== 'BANK_TRANSFER') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({ where: { id: payoutId }, data: { status: PayoutStatus.FAILED, failureReason: 'Seller has no MoMo phone on file' } });
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx, payoutId);
      });
      throw new BadRequestException('Seller has no MoMo phone on file');
    }

    const bankCode = MOMO_BANK_CODES[payout.payoutMethod];

    let recipientCode: string;
    try {
      recipientCode = await this.getOrCreateRecipient(
        secret,
        payout.sellerId,
        payout.seller.name,
        phone!,
        bankCode,
        payout.payoutMethod,
      );
    } catch (recipientErr) {
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({ where: { id: payoutId }, data: { status: PayoutStatus.FAILED, failureReason: recipientErr instanceof Error ? recipientErr.message : String(recipientErr) } });
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx, payoutId);
      });
      throw recipientErr;
    }

    const amountInPesewas = Math.round(payout.amount * 100);

    let transferData: PaystackTransferResponse;
    try {
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
      transferData = (await transferRes.json()) as PaystackTransferResponse;
    } catch (networkErr) {
      // Network timeout or DNS failure: Paystack may or may not have received the request.
      // Restore the debit and mark TRANSFER_UNKNOWN. Requires admin reconciliation.
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.TRANSFER_UNKNOWN,
            recipientCode,
            failureReason: `Paystack API unreachable: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`,
          },
        });
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx, payoutId);
      });
      this.logger.error(`Payout ${payoutId} → TRANSFER_UNKNOWN: Paystack network error — balance restored, requires admin reconciliation`);
      return;
    }

    if (!transferData.status || !transferData.data) {
      // Paystack explicitly rejected the transfer. Restore the debit.
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.FAILED,
            recipientCode,
            failureReason: `Paystack rejected: ${transferData.message}`,
          },
        });
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx, payoutId);
      });
      this.logger.error(`Payout ${payoutId} FAILED: Paystack rejected — ${transferData.message}`);
      throw new BadRequestException(`Paystack transfer failed: ${transferData.message}`);
    }

    // Transfer accepted by Paystack. Store the transfer_code; payout stays PROCESSING.
    // The transfer.success webhook will call handleTransferSuccess → finalizeWithdrawal → COMPLETED.
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        transferCode: transferData.data.transfer_code,
        processedAt: new Date(),
        recipientCode,
      },
    });

    this.logger.log(`Payout ${payoutId} PROCESSING — transfer_code: ${transferData.data.transfer_code}, reference: ${reference}`);

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
        // TRANSFER_UNKNOWN: Paystack timed out but the transfer went through anyway;
        // debit was restored in processPayout and must be re-applied here.
        status: { in: [PayoutStatus.PROCESSING, PayoutStatus.TRANSFER_UNKNOWN] },
      },
    });

    if (!payout) {
      this.logger.warn(`transfer.success: no PROCESSING/TRANSFER_UNKNOWN payout found for code=${transferCode} ref=${reference}`);
      return;
    }

    const wasTransferUnknown = payout.status === PayoutStatus.TRANSFER_UNKNOWN;

    // Atomic idempotency guard: if two transfer.success webhooks arrive concurrently,
    // only the one that wins the updateMany proceeds — the other sees count = 0.
    let updated = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payout.updateMany({
        where: { id: payout.id, status: { in: [PayoutStatus.PROCESSING, PayoutStatus.TRANSFER_UNKNOWN] } },
        data: { status: PayoutStatus.COMPLETED, completedAt: new Date() },
      });
      if (count === 0) return;
      updated = true;

      // For TRANSFER_UNKNOWN payouts the debit was restored in processPayout; re-apply it now.
      // If the seller spent the restored balance in the interim, record the debt and let admin reconcile.
      if (wasTransferUnknown) {
        try {
          await this.walletService.debitAvailable(payout.sellerId, payout.amount, tx, payout.id);
        } catch (debitErr) {
          if (debitErr instanceof BadRequestException) {
            await this.walletService.recordSellerDebt(payout.sellerId, payout.amount, tx, undefined, payout.id);
            this.logger.error(
              `Payout ${payout.id} TRANSFER_UNKNOWN resolved but seller balance insufficient — SELLER_DEBT_RECORDED, requires admin recovery`,
            );
          } else {
            throw debitErr;
          }
        }
      }

      await this.walletService.finalizeWithdrawal(payout.sellerId, payout.amount, tx, payout.id);

      if (payout.orderId) {
        await tx.order.updateMany({
          where: { id: payout.orderId, escrowStatus: 'RELEASE_PENDING' },
          data: { escrowStatus: 'RELEASED', status: 'Completed' },
        });
      }
    });

    if (!updated) {
      this.logger.warn(`transfer.success: payout ${payout.id} already processed — idempotent skip`);
      return;
    }

    if (payout.orderId) {
      this.chatGateway?.emitOrderUpdated(payout.orderId, { escrowStatus: 'RELEASED', paymentStatus: 'Paid' });
    }

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      '💰 Payout completed',
      `GHS ${payout.amount.toFixed(2)} has been sent to your account.`,
    ).catch(() => undefined);

    this.logger.log(`Payout ${payout.id} COMPLETED — GHS ${payout.amount}`);
  }

  // ─── Webhook: transfer.failed ─────────────────────────────────────────────

  async handleTransferFailed(transferCode: string, reference: string, reason?: string) {
    const payout = await this.prisma.payout.findFirst({
      where: {
        OR: [{ transferCode }, { transferReference: reference }],
        // TRANSFER_UNKNOWN: balance was already restored in processPayout; no refund needed here.
        status: { in: [PayoutStatus.PROCESSING, PayoutStatus.TRANSFER_UNKNOWN] },
      },
    });

    if (!payout) {
      this.logger.warn(`transfer.failed: no PROCESSING/TRANSFER_UNKNOWN payout found for code=${transferCode} ref=${reference}`);
      return;
    }

    const wasProcessing = payout.status === PayoutStatus.PROCESSING;

    let updated = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payout.updateMany({
        where: { id: payout.id, status: { in: [PayoutStatus.PROCESSING, PayoutStatus.TRANSFER_UNKNOWN] } },
        data: { status: PayoutStatus.FAILED, failureReason: reason ?? 'Transfer failed' },
      });
      if (count === 0) return;
      updated = true;
      // PROCESSING = balance was debited in processPayout → restore it.
      // TRANSFER_UNKNOWN = balance was already restored in processPayout → no-op.
      if (wasProcessing) {
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx, payout.id);
      }
    });

    if (!updated) {
      this.logger.warn(`transfer.failed: payout ${payout.id} already processed — idempotent skip`);
      return;
    }

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout failed',
      `Your payout of GHS ${payout.amount.toFixed(2)} failed. ${wasProcessing ? 'Your balance has been restored. ' : ''}Please contact support.`,
    ).catch(() => undefined);

    this.logger.error(`Payout ${payout.id} FAILED: ${reason ?? 'unknown'} — ${wasProcessing ? 'balance restored' : 'balance unchanged (was TRANSFER_UNKNOWN)'}`);
  }

  // ─── Webhook: transfer.reversed ────────────────────────────────────────────

  async handleTransferReversed(transferCode: string, reference: string, reason?: string) {
    const payout = await this.prisma.payout.findFirst({
      where: {
        OR: [{ transferCode }, { transferReference: reference }],
        status: PayoutStatus.COMPLETED,
      },
    });

    if (!payout) {
      this.logger.warn(`transfer.reversed: no COMPLETED payout found for code=${transferCode} ref=${reference}`);
      return;
    }

    // Atomic idempotency guard; also guards against double-reversal.
    let updated = false;
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payout.updateMany({
        where: { id: payout.id, status: PayoutStatus.COMPLETED },
        data: { status: PayoutStatus.REVERSED, failureReason: reason ?? 'Transfer reversed by Paystack' },
      });
      if (count === 0) return;
      updated = true;
      // Restore availableBalance AND decrement totalWithdrawn in one atomic operation.
      await this.walletService.reverseWithdrawal(payout.sellerId, payout.amount, tx, payout.id);
    });

    if (!updated) {
      this.logger.warn(`transfer.reversed: payout ${payout.id} already processed — idempotent skip`);
      return;
    }

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout reversed',
      `Your payout of GHS ${payout.amount.toFixed(2)} was reversed by Paystack. Your balance has been restored. Please contact support.`,
    ).catch(() => undefined);

    this.logger.error(`Payout ${payout.id} REVERSED: ${reason ?? 'unknown'} — availableBalance restored, totalWithdrawn decremented`);
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

    // Atomic conditional update so two simultaneous admin approvals cannot both win.
    // processPayout's own lock handles the APPROVED → PROCESSING transition.
    const { count } = await this.prisma.payout.updateMany({
      where: { id: payoutId, status: PayoutStatus.PENDING },
      data: { status: PayoutStatus.APPROVED, approvedAt: new Date() },
    });
    if (count === 0) {
      throw new BadRequestException('Payout was already processed by another request');
    }

    // processPayout sets FAILED/TRANSFER_UNKNOWN internally on error — no rollback needed here.
    await this.processPayout(payoutId);

    const result = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (result?.status === PayoutStatus.APPROVED) {
      throw new ConflictException('Payout approved but could not be processed — PAYSTACK_SECRET_KEY is not configured');
    }
    return result;
  }

  // ─── Admin: cancel/void a payout and restore seller balance ──────────────

  async adminCancelPayout(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');

    // TRANSFER_UNKNOWN: balance was already restored in processPayout — no refund needed on cancel.
    // Admin should verify the Paystack transfer status before cancelling a TRANSFER_UNKNOWN payout.
    const cancellable: PayoutStatus[] = [PayoutStatus.PENDING, PayoutStatus.PROCESSING, PayoutStatus.TRANSFER_UNKNOWN];
    if (!cancellable.includes(payout.status)) {
      throw new ForbiddenException(`Cannot cancel a payout with status ${payout.status}`);
    }

    // Two-phase conditional update guards against a concurrent state change
    // (e.g. PROCESSING → COMPLETED via webhook) racing the stale `payout.status` read above.
    let needsRefund = false;
    await this.prisma.$transaction(async (tx) => {
      // First: try PROCESSING — balance was debited in processPayout, must restore it.
      const processingResult = await tx.payout.updateMany({
        where: { id: payoutId, status: PayoutStatus.PROCESSING },
        data: { status: PayoutStatus.CANCELLED, failureReason: 'Cancelled by admin — balance restored' },
      });
      if (processingResult.count > 0) {
        needsRefund = true;
        await this.walletService.refundAvailable(payout.sellerId, payout.amount, tx);
        return;
      }
      // Second: try PENDING / TRANSFER_UNKNOWN — balance not debited or already restored.
      const otherResult = await tx.payout.updateMany({
        where: { id: payoutId, status: { in: [PayoutStatus.PENDING, PayoutStatus.TRANSFER_UNKNOWN] } },
        data: { status: PayoutStatus.CANCELLED, failureReason: 'Cancelled by admin' },
      });
      if (otherResult.count === 0) {
        throw new ConflictException(`Payout ${payoutId} can no longer be cancelled — status changed concurrently`);
      }
    });

    this.notificationService?.notify(
      payout.sellerId,
      'payout',
      'Payout voided',
      `Your payout of GHS ${payout.amount.toFixed(2)} was cancelled${needsRefund ? ' and your balance has been restored' : ''}.`,
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
