import { Injectable, NotFoundException } from '@nestjs/common';
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
  async creditPending(userId: string, amount: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.wallet.upsert({
      where: { userId },
      create: { userId, pendingBalance: amount },
      update: { pendingBalance: { increment: amount } },
    });
  }

  /**
   * Move funds from pending → available (called when buyer confirms delivery).
   * Also updates totalEarnings.
   */
  async pendingToAvailable(userId: string, amount: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.wallet.upsert({
      where: { userId },
      create: { userId, availableBalance: amount, totalEarnings: amount },
      update: {
        pendingBalance:   { decrement: amount },
        availableBalance: { increment: amount },
        totalEarnings:    { increment: amount },
      },
    });
  }

  /**
   * Lock available funds for an outgoing payout (called when payout is processed).
   * Decrements availableBalance. Fails if balance would go negative.
   */
  async debitAvailable(userId: string, amount: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const wallet = await client.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.availableBalance < amount) {
      throw new Error(`Insufficient available balance for payout (have ${wallet?.availableBalance ?? 0}, need ${amount})`);
    }
    await client.wallet.update({
      where: { userId },
      data: { availableBalance: { decrement: amount } },
    });
  }

  /**
   * Refund available balance (called when a payout transfer fails).
   */
  async refundAvailable(userId: string, amount: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.wallet.upsert({
      where: { userId },
      create: { userId, availableBalance: amount },
      update: { availableBalance: { increment: amount } },
    });
  }

  /**
   * Finalize a completed withdrawal (called on transfer.success webhook).
   */
  async finalizeWithdrawal(userId: string, amount: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    await client.wallet.upsert({
      where: { userId },
      create: { userId, totalWithdrawn: amount },
      update: { totalWithdrawn: { increment: amount } },
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
}
