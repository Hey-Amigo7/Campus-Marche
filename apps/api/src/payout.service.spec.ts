import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PayoutStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PayoutService } from './payout.service';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';

// Separate tx mock so we can control updateMany call order per test
const makeMockTx = () => ({
  payout: { updateMany: jest.fn(), update: jest.fn(), create: jest.fn() },
  order: { updateMany: jest.fn(), update: jest.fn() },
});

let mockTx = makeMockTx();

const mockPrisma = {
  payout: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  user: { findMany: jest.fn() },
  transferRecipient: { findFirst: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
};

const mockWallet = {
  debitAvailable: jest.fn(),
  refundAvailable: jest.fn(),
  finalizeWithdrawal: jest.fn(),
  reverseWithdrawal: jest.fn(),
  recordSellerDebt: jest.fn(),
  getBalance: jest.fn(),
  creditPending: jest.fn(),
  pendingToAvailable: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue(undefined),
};

describe('PayoutService', () => {
  let service: PayoutService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx = makeMockTx();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWallet },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<PayoutService>(PayoutService);
  });

  // ─── Bug #1: adminCancelPayout ─────────────────────────────────────────────

  describe('adminCancelPayout (Bug #1 — two-phase atomic cancel)', () => {
    const basePayout = { id: 'pay-1', sellerId: 'seller-1', amount: 100, status: PayoutStatus.PROCESSING };

    it('refunds balance when cancelling a PROCESSING payout (first updateMany wins)', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue(basePayout);
      mockTx.payout.updateMany
        .mockResolvedValueOnce({ count: 1 }) // PROCESSING matches → cancel + refund
        .mockResolvedValueOnce({ count: 0 }); // never reached

      const result = await service.adminCancelPayout('pay-1');

      expect(result.message).toContain('balance restored');
      expect(mockWallet.refundAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx);
    });

    it('does not refund balance when cancelling a PENDING payout (second updateMany wins)', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue({ ...basePayout, status: PayoutStatus.PENDING });
      mockTx.payout.updateMany
        .mockResolvedValueOnce({ count: 0 }) // PROCESSING — no match
        .mockResolvedValueOnce({ count: 1 }); // PENDING matches → cancel only

      const result = await service.adminCancelPayout('pay-1');

      expect(result.message).toBe('Payout cancelled.');
      expect(mockWallet.refundAvailable).not.toHaveBeenCalled();
    });

    it('throws ConflictException when both updateMany return 0 (status changed concurrently)', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue(basePayout);
      mockTx.payout.updateMany
        .mockResolvedValueOnce({ count: 0 }) // PROCESSING — race lost
        .mockResolvedValueOnce({ count: 0 }); // PENDING/TRANSFER_UNKNOWN — also gone

      await expect(service.adminCancelPayout('pay-1')).rejects.toThrow(ConflictException);
      expect(mockWallet.refundAvailable).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException before entering transaction for non-cancellable status', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue({ ...basePayout, status: PayoutStatus.COMPLETED });

      await expect(service.adminCancelPayout('pay-1')).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown payoutId', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue(null);
      await expect(service.adminCancelPayout('pay-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Bug #8: adminApprovePayout ────────────────────────────────────────────

  describe('adminApprovePayout (Bug #8 — surface silent processPayout failure)', () => {
    it('throws ConflictException when processPayout returns without advancing status (no secret key)', async () => {
      // adminApprovePayout initial read → PENDING
      // processPayout's findUnique (include seller) → APPROVED + seller info (secret missing → returns early)
      // adminApprovePayout final read → still APPROVED → throw
      const pendingPayout = { id: 'pay-1', status: PayoutStatus.PENDING };
      const approvedWithSeller = {
        id: 'pay-1', status: PayoutStatus.APPROVED, sellerId: 'seller-1', amount: 100,
        payoutMethod: 'MTN_MOMO',
        seller: { name: 'Alice', business: null },
      };
      mockPrisma.payout.findUnique
        .mockResolvedValueOnce(pendingPayout)       // adminApprovePayout initial check
        .mockResolvedValueOnce(approvedWithSeller)  // processPayout lookup (secret missing → returns early)
        .mockResolvedValueOnce({ id: 'pay-1', status: PayoutStatus.APPROVED }); // final check

      mockPrisma.payout.updateMany.mockResolvedValue({ count: 1 }); // PENDING → APPROVED
      mockConfig.get.mockReturnValue(undefined); // no PAYSTACK_SECRET_KEY

      await expect(service.adminApprovePayout('pay-1')).rejects.toThrow(ConflictException);
    });

    it('returns result when processPayout advances status normally', async () => {
      const pendingPayout = { id: 'pay-1', status: PayoutStatus.PENDING };
      const completedPayout = { id: 'pay-1', status: PayoutStatus.COMPLETED };
      const inProgressPayout = {
        id: 'pay-1', status: PayoutStatus.APPROVED, sellerId: 'seller-1', amount: 100,
        payoutMethod: 'MTN_MOMO',
        seller: { name: 'Alice', business: null },
      };
      mockPrisma.payout.findUnique
        .mockResolvedValueOnce(pendingPayout)      // adminApprovePayout initial check
        .mockResolvedValueOnce(inProgressPayout)   // processPayout lookup
        .mockResolvedValueOnce(completedPayout);   // final check

      mockPrisma.payout.updateMany.mockResolvedValue({ count: 1 }); // adminApprovePayout PENDING → APPROVED
      // processPayout's $transaction (APPROVED → PROCESSING) + debitAvailable:
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.debitAvailable.mockResolvedValue(undefined);
      mockConfig.get.mockReturnValue('sk_test_abc'); // has secret → enters test mode bypass
      // test mode bypass → second $transaction
      mockTx.payout.update.mockResolvedValue({});
      mockWallet.finalizeWithdrawal.mockResolvedValue(undefined);
      mockTx.order.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.adminApprovePayout('pay-1');

      expect(result?.status).toBe(PayoutStatus.COMPLETED);
    });
  });

  // ─── Bug #3: handleTransferSuccess TRANSFER_UNKNOWN balance fallback ────────

  describe('handleTransferSuccess (Bug #3 — TRANSFER_UNKNOWN insufficient balance fallback)', () => {
    const unknownPayout = {
      id: 'pay-1',
      sellerId: 'seller-1',
      amount: 100,
      status: PayoutStatus.TRANSFER_UNKNOWN,
      orderId: null,
    };

    it('records seller debt and continues when TRANSFER_UNKNOWN seller balance is insufficient', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(unknownPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.debitAvailable.mockRejectedValue(new BadRequestException('Insufficient balance'));
      mockWallet.recordSellerDebt.mockResolvedValue(undefined);
      mockWallet.finalizeWithdrawal.mockResolvedValue(undefined);

      await expect(service.handleTransferSuccess('TC_1', 'CM-PAYOUT-pay-1')).resolves.not.toThrow();

      expect(mockWallet.recordSellerDebt).toHaveBeenCalledWith('seller-1', 100, mockTx, undefined, 'pay-1');
      expect(mockWallet.finalizeWithdrawal).toHaveBeenCalledWith('seller-1', 100, mockTx, 'pay-1');
    });

    it('re-throws unexpected errors from debitAvailable (non-BadRequestException)', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(unknownPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.debitAvailable.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.handleTransferSuccess('TC_1', 'CM-PAYOUT-pay-1')).rejects.toThrow('DB connection lost');
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('calls debitAvailable normally when balance is sufficient', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(unknownPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.debitAvailable.mockResolvedValue(undefined);
      mockWallet.finalizeWithdrawal.mockResolvedValue(undefined);

      await service.handleTransferSuccess('TC_1', 'CM-PAYOUT-pay-1');

      expect(mockWallet.debitAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx, 'pay-1');
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('does not call debitAvailable for PROCESSING payouts (balance already debited in lock)', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue({ ...unknownPayout, status: PayoutStatus.PROCESSING });
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.finalizeWithdrawal.mockResolvedValue(undefined);

      await service.handleTransferSuccess('TC_1', 'CM-PAYOUT-pay-1');

      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('duplicate transfer.success (payout already COMPLETED) → findFirst returns null → no wallet calls', async () => {
      // findFirst filters status IN [PROCESSING, TRANSFER_UNKNOWN] — a COMPLETED payout is invisible.
      mockPrisma.payout.findFirst.mockResolvedValue(null);

      await expect(service.handleTransferSuccess('TC_1', 'CM-PAYOUT-pay-1')).resolves.not.toThrow();

      expect(mockWallet.finalizeWithdrawal).not.toHaveBeenCalled();
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });

    it('concurrent transfer.success: count=0 from updateMany inside tx → second caller skips all wallet mutations', async () => {
      // Both webhooks found the payout in PROCESSING, but the first committed.
      // Second gets count=0 and must not double-finalize.
      mockPrisma.payout.findFirst.mockResolvedValue({ ...unknownPayout, status: PayoutStatus.PROCESSING });
      mockTx.payout.updateMany.mockResolvedValue({ count: 0 });

      await service.handleTransferSuccess('TC_1', 'CM-PAYOUT-pay-1');

      expect(mockWallet.finalizeWithdrawal).not.toHaveBeenCalled();
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });
  });

  // ─── handleTransferFailed ──────────────────────────────────────────────────

  describe('handleTransferFailed — idempotency and balance routing', () => {
    const processingPayout = { id: 'pay-1', sellerId: 'seller-1', amount: 100, status: PayoutStatus.PROCESSING };
    const unknownPayoutF   = { id: 'pay-1', sellerId: 'seller-1', amount: 100, status: PayoutStatus.TRANSFER_UNKNOWN };

    it('PROCESSING: refunds available balance (balance was debited in processPayout lock)', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(processingPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.refundAvailable.mockResolvedValue(undefined);

      await service.handleTransferFailed('TC_1', 'CM-PAYOUT-pay-1', 'Insufficient funds');

      expect(mockWallet.refundAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx, 'pay-1');
    });

    it('TRANSFER_UNKNOWN: does NOT call refundAvailable (balance was already restored in processPayout)', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(unknownPayoutF);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });

      await service.handleTransferFailed('TC_1', 'CM-PAYOUT-pay-1');

      expect(mockWallet.refundAvailable).not.toHaveBeenCalled();
    });

    it('duplicate transfer.failed: payout not found (already FAILED) → returns without wallet calls', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(null);

      await expect(service.handleTransferFailed('TC_1', 'CM-PAYOUT-pay-1')).resolves.not.toThrow();

      expect(mockWallet.refundAvailable).not.toHaveBeenCalled();
    });

    it('concurrent transfer.failed: count=0 from updateMany → skips refundAvailable', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(processingPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 0 });

      await service.handleTransferFailed('TC_1', 'CM-PAYOUT-pay-1');

      expect(mockWallet.refundAvailable).not.toHaveBeenCalled();
    });
  });

  // ─── handleTransferReversed ────────────────────────────────────────────────

  describe('handleTransferReversed — reversal after completed payout', () => {
    const completedPayout = { id: 'pay-1', sellerId: 'seller-1', amount: 100, status: PayoutStatus.COMPLETED, orderId: null };

    it('COMPLETED: calls reverseWithdrawal and transitions status to REVERSED', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(completedPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.reverseWithdrawal.mockResolvedValue(undefined);

      await service.handleTransferReversed('TC_1', 'CM-PAYOUT-pay-1', 'Recipient account blocked');

      expect(mockWallet.reverseWithdrawal).toHaveBeenCalledWith('seller-1', 100, mockTx, 'pay-1');
      expect(mockTx.payout.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1', status: PayoutStatus.COMPLETED },
          data:  expect.objectContaining({ status: PayoutStatus.REVERSED }),
        }),
      );
    });

    it('duplicate transfer.reversed: findFirst returns null (already REVERSED) → no wallet calls', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(null);

      await expect(service.handleTransferReversed('TC_1', 'CM-PAYOUT-pay-1')).resolves.not.toThrow();

      expect(mockWallet.reverseWithdrawal).not.toHaveBeenCalled();
    });

    it('concurrent transfer.reversed: count=0 from updateMany → skips reverseWithdrawal', async () => {
      mockPrisma.payout.findFirst.mockResolvedValue(completedPayout);
      mockTx.payout.updateMany.mockResolvedValue({ count: 0 });

      await service.handleTransferReversed('TC_1', 'CM-PAYOUT-pay-1');

      expect(mockWallet.reverseWithdrawal).not.toHaveBeenCalled();
    });
  });

  // ─── processPayout concurrency lock ───────────────────────────────────────

  describe('processPayout — concurrent lock via payout.updateMany', () => {
    const payoutWithSeller = {
      id: 'pay-1', sellerId: 'seller-1', amount: 100,
      status: PayoutStatus.PENDING, payoutMethod: 'MTN_MOMO', orderId: null,
      seller: { name: 'Alice', business: null },
    };

    it('concurrent processPayout: count=0 from updateMany → aborts without debitAvailable or Paystack call', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue(payoutWithSeller);
      mockTx.payout.updateMany.mockResolvedValue({ count: 0 });
      mockConfig.get.mockReturnValue('sk_test_abc');

      await service.processPayout('pay-1', '0241234567');

      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });

    it('uses deterministic reference CM-PAYOUT-{payoutId} so Paystack deduplicates retries', async () => {
      mockPrisma.payout.findUnique.mockResolvedValue(payoutWithSeller);
      mockTx.payout.updateMany.mockResolvedValue({ count: 1 });
      mockWallet.debitAvailable.mockResolvedValue(undefined);
      mockConfig.get.mockReturnValue('sk_test_abc');
      mockTx.payout.update.mockResolvedValue({});
      mockWallet.finalizeWithdrawal.mockResolvedValue(undefined);
      mockTx.order.updateMany.mockResolvedValue({ count: 0 });

      await service.processPayout('pay-1', '0241234567');

      expect(mockTx.payout.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ transferReference: 'CM-PAYOUT-pay-1' }),
        }),
      );
    });
  });
});
