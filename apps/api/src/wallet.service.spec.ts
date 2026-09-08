import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from './prisma.service';

const mockPrisma = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  walletTransaction: { create: jest.fn() },
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
      mockPrisma.walletTransaction.create.mockResolvedValue({});

      await service.recordSellerDebt('user-1', 100, undefined, undefined, 'payout-1');

      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'SELLER_DEBT_RECORDED', payoutId: 'payout-1' }),
      });
    });

    it('returns without error when wallet does not exist', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(service.recordSellerDebt('user-1', 100)).resolves.toBeUndefined();
      expect(mockPrisma.walletTransaction.create).not.toHaveBeenCalled();
    });
  });
});
