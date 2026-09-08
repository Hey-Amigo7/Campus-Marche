import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EscrowStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';
import { PayoutService } from './payout.service';

const makeMockTx = () => ({
  order:              { update: jest.fn(), updateMany: jest.fn() },
  paymentTransaction: { update: jest.fn() },
  platformRevenue:    { updateMany: jest.fn(), upsert: jest.fn() },
  payout:             { create: jest.fn() },
});

let mockTx = makeMockTx();

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
  },
  paymentTransaction: { findUnique: jest.fn(), update: jest.fn() },
  payout:             { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  webhookLog:         { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
};

const mockWallet = {
  pendingToAvailable: jest.fn(),
  debitAvailable:     jest.fn(),
  reversePending:     jest.fn(),
  recordSellerDebt:   jest.fn(),
  creditPending:      jest.fn(),
  refundAvailable:    jest.fn(),
};

const mockPayout = {
  createEscrowPayout:     jest.fn(),
  processPayout:          jest.fn(),
  handleTransferSuccess:  jest.fn(),
  handleTransferFailed:   jest.fn(),
  handleTransferReversed: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: string) => {
    if (key === 'PAYOUT_AUTO_APPROVE')  return 'true';
    if (key === 'PAYSTACK_SECRET_KEY')  return 'sk_test_abc123';
    return defaultVal ?? undefined;
  }),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx = makeMockTx();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: true, message: 'Refund queued' }),
    } as unknown as Response);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWallet },
        { provide: PayoutService, useValue: mockPayout },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<PaymentService>(PaymentService);
  });

  // ─── Bug #4 + Bug #2: adminRefundOrder wallet reversal logic ────────────────

  describe('adminRefundOrder (Bug #4 — DELIVERED, Bug #2 — RELEASED)', () => {
    const makeOrder = (escrowStatus: string) => ({
      id: 'order-1',
      escrowStatus,
      sellerId:     'seller-1',
      sellerAmount: 100,
      payments: [{ reference: 'ref-1', status: 'Paid' }],
    });

    beforeEach(() => {
      mockTx.order.update.mockResolvedValue({});
      mockTx.paymentTransaction.update.mockResolvedValue({});
      mockTx.platformRevenue.updateMany.mockResolvedValue({});
    });

    it('Bug #4: DELIVERED → reversePending (funds still in pendingBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('DELIVERED'));

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('Bug #4: ESCROW_HELD → reversePending (funds in pendingBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('ESCROW_HELD'));

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
    });

    it('Bug #4: SHIPPED → reversePending (funds in pendingBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('SHIPPED'));

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
    });

    it('RELEASE_PENDING → debitAvailable (funds moved to availableBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('RELEASE_PENDING'));

      await service.adminRefundOrder('order-1');

      expect(mockWallet.debitAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx, undefined);
      expect(mockWallet.reversePending).not.toHaveBeenCalled();
    });

    it('Bug #2: RELEASED → recordSellerDebt (payout already completed, cannot claw back)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('RELEASED'));

      await service.adminRefundOrder('order-1');

      expect(mockWallet.recordSellerDebt).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.reversePending).not.toHaveBeenCalled();
    });
  });

  // ─── Bug #4: handleRefund wallet reversal logic ─────────────────────────────

  describe('handleRefund (Bug #4 — DELIVERED in webhook path)', () => {
    const makeOrder = (escrowStatus: string) => ({
      id: 'order-1',
      escrowStatus,
      paymentReference: 'ref-1',
      sellerId:     'seller-1',
      sellerAmount: 100,
    });

    // Access private method via type cast
    const callHandleRefund = (svc: PaymentService, data: Record<string, unknown>) =>
      (svc as unknown as { handleRefund: (d: Record<string, unknown>) => Promise<void> }).handleRefund(data);

    beforeEach(() => {
      mockTx.order.update.mockResolvedValue({});
    });

    it('Bug #4: DELIVERED → reversePending (not debitAvailable)', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('DELIVERED'));

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx);
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });

    it('RELEASE_PENDING → debitAvailable', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('RELEASE_PENDING'));

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.debitAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx);
      expect(mockWallet.reversePending).not.toHaveBeenCalled();
    });

    it('Bug #2: RELEASED → recordSellerDebt', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('RELEASED'));

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.recordSellerDebt).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });
  });

  // ─── Bug #6: adminResolveDispute atomic claim ───────────────────────────────

  describe('adminResolveDispute (Bug #6 — atomic DISPUTED claim)', () => {
    const disputedOrder = {
      id: 'order-1',
      escrowStatus: 'DISPUTED',
      buyerId:  'buyer-1',
      sellerId: 'seller-1',
    };

    it('uses updateMany with escrowStatus: DISPUTED to atomically claim the dispute', async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(disputedOrder)
        .mockResolvedValueOnce({
          ...disputedOrder,
          escrowStatus: 'ESCROW_HELD',
          sellerAmount: 100,
          payments: [{ reference: 'ref-1', status: 'Paid' }],
        });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.order.update.mockResolvedValue({});
      mockTx.paymentTransaction.update.mockResolvedValue({});
      mockTx.platformRevenue.updateMany.mockResolvedValue({});

      await service.adminResolveDispute('order-1', 'REFUND_BUYER');

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1', escrowStatus: EscrowStatus.DISPUTED },
          data:  expect.objectContaining({ escrowStatus: EscrowStatus.ESCROW_HELD }),
        }),
      );
    });

    it('throws ConflictException when updateMany returns 0 and order is still DISPUTED', async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(disputedOrder)
        .mockResolvedValueOnce(disputedOrder); // still DISPUTED on re-check
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.adminResolveDispute('order-1', 'REFUND_BUYER')).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when order is not currently DISPUTED', async () => {
      const releasedOrder = { ...disputedOrder, escrowStatus: 'RELEASED' };
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(releasedOrder)
        .mockResolvedValueOnce(releasedOrder);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.adminResolveDispute('order-1', 'REFUND_BUYER')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown orderId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);
      await expect(service.adminResolveDispute('order-1', 'REFUND_BUYER')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Bug #5: releaseEscrowInternal — payout created inside transaction ───────

  describe('releaseEscrowInternal (Bug #5 — atomic payout creation)', () => {
    const escrowOrder = {
      id: 'order-1',
      escrowStatus: 'ESCROW_HELD',
      sellerId:     'seller-1',
      sellerAmount: 100,
      price:        100,
      buyerId:      'buyer-1',
      product: {
        sellerId:    'seller-1',
        listingType: 'product',
        seller: {
          name: 'Alice',
          business: { momoProvider: 'mtn', momoPhone: '0241234567' },
        },
      },
    };

    beforeEach(() => {
      mockTx.order.update.mockResolvedValue({});
      mockTx.payout.create.mockResolvedValue({ id: 'payout-1' });
      mockWallet.pendingToAvailable.mockResolvedValue(undefined);
      mockPayout.processPayout.mockResolvedValue(undefined);
    });

    it('Bug #5: payout is created inside the $transaction (same DB transaction as balance update)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(escrowOrder);

      await service.releaseEscrowInternal('order-1');

      expect(mockTx.payout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sellerId: 'seller-1', orderId: 'order-1', amount: 100 }),
        }),
      );
    });

    it('Bug #5: processPayout is called outside the transaction with the created payoutId', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(escrowOrder);
      mockTx.payout.create.mockResolvedValue({ id: 'payout-abc' });

      await service.releaseEscrowInternal('order-1');

      expect(mockPayout.processPayout).toHaveBeenCalledWith('payout-abc', '0241234567');
    });

    it('Bug #5: processPayout failure is caught and logged without propagating to caller', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(escrowOrder);
      mockPayout.processPayout.mockRejectedValue(new Error('Paystack down'));
      mockPrisma.payout.update.mockResolvedValue({});

      await expect(service.releaseEscrowInternal('order-1')).resolves.not.toThrow();
      expect(mockPrisma.payout.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failureReason: 'Paystack down' }) }),
      );
    });

    it('throws BadRequestException for non-releasable escrow states', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...escrowOrder, escrowStatus: 'RELEASED' });
      await expect(service.releaseEscrowInternal('order-1')).rejects.toThrow(BadRequestException);
    });
  });
});
