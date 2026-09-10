import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from './prisma.service';

const mockPrisma = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  walletTransaction: { create: jest.fn(), findFirst: jest.fn() },
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<WalletService>(WalletService);
  });

  describe('reverseWithdrawal (Bug #7)', () => {
    it('throws instead of silently returning when wallet is not found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(service.reverseWithdrawal('user-1', 100, undefined, 'payout-1'))
        .rejects.toThrow('reverseWithdrawal: wallet not found');
    });

    it('updates balances and creates ledger entry when wallet exists', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1' });
      mockPrisma.wallet.update.mockResolvedValue({});
      mockPrisma.walletTransaction.create.mockResolvedValue({});

      await service.reverseWithdrawal('user-1', 50, undefined, 'payout-1');

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          availableBalance: { increment: 50 },
          totalWithdrawn: { decrement: 50 },
        },
      });
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'TRANSFER_REVERSED', amount: 50, payoutId: 'payout-1' }),
      });
    });
  });

  describe('recordSellerDebt', () => {
    it('creates SELLER_DEBT_RECORDED ledger entry without changing any balance', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1' });
      mockPrisma.walletTransaction.findFirst.mockResolvedValue(null); // no existing entry
      mockPrisma.walletTransaction.create.mockResolvedValue({});

      await service.recordSellerDebt('user-1', 100, undefined, 'order-1');

      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'SELLER_DEBT_RECORDED', amount: 100, orderId: 'order-1' }),
      });
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
      expect(mockPrisma.wallet.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.wallet.updateMany).not.toHaveBeenCalled();
    });

    it('links payoutId when provided', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1' });
      mockPrisma.walletTransaction.findFirst.mockResolvedValue(null);
      mockPrisma.walletTransaction.create.mockResolvedValue({});

      await service.recordSellerDebt('user-1', 100, undefined, undefined, 'payout-1');

      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'SELLER_DEBT_RECORDED', payoutId: 'payout-1' }),
      });
    });

    it('throws loudly when wallet does not exist (debt must not disappear silently)', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(service.recordSellerDebt('user-1', 100, undefined, 'order-1'))
        .rejects.toThrow('recordSellerDebt: wallet not found');
      expect(mockPrisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('is idempotent: skips create when a debt entry for the same orderId already exists', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1' });
      mockPrisma.walletTransaction.findFirst.mockResolvedValue({ id: 'existing-entry' }); // already recorded

      await service.recordSellerDebt('user-1', 100, undefined, 'order-1');

      expect(mockPrisma.walletTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('debitAvailable', () => {
    it('decrements availableBalance and creates ledger entry when balance is sufficient', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1', availableBalance: 200 });
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.walletTransaction.create.mockResolvedValue({});

      await service.debitAvailable('user-1', 100, undefined, 'payout-1');

      expect(mockPrisma.wallet.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', availableBalance: { gte: 100 } },
        data: { availableBalance: { decrement: 100 } },
      });
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'DEBIT_AVAILABLE', amount: 100, payoutId: 'payout-1' }),
      });
    });

    it('throws BadRequestException when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(service.debitAvailable('user-1', 100)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when pre-read shows insufficient balance', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1', availableBalance: 50 });
      await expect(service.debitAvailable('user-1', 100)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.wallet.updateMany).not.toHaveBeenCalled();
    });

    it('concurrent double-debit: count=0 from updateMany → throws BadRequestException', async () => {
      // Pre-read shows balance=100 (passes initial check), but concurrent call won the atomic update.
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1', availableBalance: 100 });
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 0 }); // concurrent call already decremented

      await expect(service.debitAvailable('user-1', 100)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('uses conditional updateMany WHERE availableBalance >= amount (not unconditional update)', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w-1', availableBalance: 200 });
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.walletTransaction.create.mockResolvedValue({});

      await service.debitAvailable('user-1', 100);

      expect(mockPrisma.wallet.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', availableBalance: { gte: 100 } },
        }),
      );
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
    });
  });
});
