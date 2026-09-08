import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /** Get wallet for a user, create it if it doesn't exist yet. */
  async getOrCreate(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  /** Add funds to seller's pending balance (called when escrow is funded). */
  async creditPending(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    orderId?: string,
  ) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.upsert({
      where: { userId },
      create: { userId, pendingBalance: amount },
      update: { pendingBalance: { increment: amount } },
    });
    await client.walletTransaction.create({
      data: { walletId: wallet.id, type: 'CREDIT_PENDING', amount, orderId },
    });
  }

  /**
   * Move funds from pending → available (called when buyer confirms delivery or
   * service completion is confirmed).
   * Also updates totalEarnings.
   */
  async pendingToAvailable(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    orderId?: string,
  ) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.upsert({
      where: { userId },
      create: { userId, availableBalance: amount, totalEarnings: amount },
      update: {
        pendingBalance:   { decrement: amount },
        availableBalance: { increment: amount },
        totalEarnings:    { increment: amount },
      },
    });
    await client.walletTransaction.create({
      data: { walletId: wallet.id, type: 'PENDING_TO_AVAILABLE', amount, orderId },
    });
  }

  /**
   * Lock available funds for an outgoing payout (called when payout is processed).
   * Decrements availableBalance. Fails if balance would go negative.
   */
  async debitAvailable(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    payoutId?: string,
  ) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.availableBalance < amount) {
      throw new BadRequestException(
        `Insufficient balance for payout — available: GHS ${(wallet?.availableBalance ?? 0).toFixed(2)}, required: GHS ${amount.toFixed(2)}`,
      );
    }
    await client.wallet.update({
      where: { userId },
      data: { availableBalance: { decrement: amount } },
    });
    await client.walletTransaction.create({
      data: { walletId: wallet.id, type: 'DEBIT_AVAILABLE', amount, payoutId },
    });
  }

  /** Refund available balance (called when a payout transfer fails). */
  async refundAvailable(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    payoutId?: string,
  ) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.upsert({
      where: { userId },
      create: { userId, availableBalance: amount },
      update: { availableBalance: { increment: amount } },
    });
    await client.walletTransaction.create({
      data: { walletId: wallet.id, type: 'REFUND_AVAILABLE', amount, payoutId },
    });
  }

  /** Reverse a pending balance credit (called when a charge is refunded before delivery). */
  async reversePending(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    orderId?: string,
  ) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.findUnique({ where: { userId } });
    await client.wallet.updateMany({
      where: { userId },
      data: { pendingBalance: { decrement: amount } },
    });
    if (wallet) {
      await client.walletTransaction.create({
        data: { walletId: wallet.id, type: 'REVERSE_PENDING', amount, orderId },
      });
    }
  }

  /** Finalize a completed withdrawal (called on transfer.success webhook). */
  async finalizeWithdrawal(
    userId: string,
    amount: number,
    tx?: Prisma.TransactionClient,
    payoutId?: string,
  ) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.upsert({
      where: { userId },
      create: { userId, totalWithdrawn: amount },
      update: { totalWithdrawn: { increment: amount } },
    });
    await client.walletTransaction.create({
      data: { walletId: wallet.id, type: 'FINALIZE_WITHDRAWAL', amount, payoutId },
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return { userId, availableBalance: 0, pendingBalance: 0, totalEarnings: 0, totalWithdrawn: 0 };
    }
    return wallet;
  }

  async getByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactionHistory(userId: string, skip = 0, take = 50) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return { transactions: [], total: 0 };

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return { transactions, total };
  }
}
