import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EscrowStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';
import { PayoutService } from './payout.service';
import { ghsToPesewas } from './commission.engine';

const makeMockTx = () => ({
  order:              { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  paymentTransaction: { update: jest.fn(), updateMany: jest.fn() },
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
    findMany:   jest.fn(),
  },
  paymentTransaction: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
  payout:             { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  webhookLog:         { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  serviceBooking:     { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  wallet:             { findMany: jest.fn() },
  walletTransaction:  { groupBy: jest.fn() },
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
  get: jest.fn((key: string) => {
    if (key === 'PAYOUT_AUTO_APPROVE')     return 'true';
    if (key === 'PAYSTACK_SECRET_KEY')     return 'sk_test_abc123';
    if (key === 'MARKETPLACE_FEE_PERCENT') return '3';
    if (key === 'MARKETPLACE_FEE_FLAT')    return '0';
    return undefined;
  }),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx = makeMockTx();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx));

    // Default audit-path mocks so existing tests don't fail on unrelated findMany calls
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
    mockPrisma.payout.findMany.mockResolvedValue([]);
    mockPrisma.webhookLog.findMany.mockResolvedValue([]);
    mockPrisma.wallet.findMany.mockResolvedValue([]);
    mockPrisma.walletTransaction.groupBy.mockResolvedValue([]);

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
      payments: [{ id: 'pay-1', reference: 'ref-1', status: 'Paid' }],
    });

    beforeEach(() => {
      // Pre-Paystack atomic claim: 'Paid' → 'Refunding'
      mockPrisma.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
      // Inside tx: 'Refunding' → 'Refunded', then order claim
      mockTx.paymentTransaction.updateMany.mockResolvedValue({});
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.platformRevenue.updateMany.mockResolvedValue({});
    });

    it('Bug #4: DELIVERED → reversePending (funds still in pendingBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('DELIVERED'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'DELIVERED' });

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('Bug #4: ESCROW_HELD → reversePending (funds in pendingBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('ESCROW_HELD'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'ESCROW_HELD' });

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
    });

    it('Bug #4: SHIPPED → reversePending (funds in pendingBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('SHIPPED'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'SHIPPED' });

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
    });

    it('RELEASE_PENDING → debitAvailable (funds moved to availableBalance)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('RELEASE_PENDING'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'RELEASE_PENDING' });

      await service.adminRefundOrder('order-1');

      expect(mockWallet.debitAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx, undefined);
      expect(mockWallet.reversePending).not.toHaveBeenCalled();
    });

    it('Bug #2: RELEASED → recordSellerDebt (payout already completed, cannot claw back)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('RELEASED'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'RELEASED' });

      await service.adminRefundOrder('order-1');

      expect(mockWallet.recordSellerDebt).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.reversePending).not.toHaveBeenCalled();
    });

    it('concurrent refund: count=0 in order updateMany → skips all wallet mutations', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('ESCROW_HELD'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'ESCROW_HELD' });
      mockTx.order.updateMany.mockResolvedValue({ count: 0 }); // concurrent call won

      await service.adminRefundOrder('order-1');

      expect(mockWallet.reversePending).not.toHaveBeenCalled();
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('payment status Refunding → throws ConflictException before reaching Paystack', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...makeOrder('ESCROW_HELD'),
        payments: [{ id: 'pay-1', reference: 'ref-1', status: 'Refunding' }],
      });

      await expect(service.adminRefundOrder('order-1')).rejects.toThrow(ConflictException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('concurrent pre-Paystack claim: paymentTransaction.updateMany count=0 → ConflictException', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('ESCROW_HELD'));
      mockPrisma.paymentTransaction.updateMany.mockResolvedValue({ count: 0 }); // concurrent caller claimed first

      await expect(service.adminRefundOrder('order-1')).rejects.toThrow(ConflictException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('Paystack call failure → restores PaymentTransaction from Refunding back to Paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('ESCROW_HELD'));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok:   false,
        json: () => Promise.resolve({ status: false, message: 'Network error' }),
      } as unknown as Response);

      await expect(service.adminRefundOrder('order-1')).rejects.toThrow(BadRequestException);

      // Should restore 'Refunding' → 'Paid' so admin can retry
      expect(mockPrisma.paymentTransaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1', status: 'Refunding' },
          data:  { status: 'Paid' },
        }),
      );
    });

    it('uses paymentTransaction.updateMany WHERE status=Paid as atomic pre-Paystack claim (not update)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(makeOrder('ESCROW_HELD'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'ESCROW_HELD' });

      await service.adminRefundOrder('order-1');

      expect(mockPrisma.paymentTransaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1', status: 'Paid' },
          data:  { status: 'Refunding' },
        }),
      );
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
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.paymentTransaction.updateMany.mockResolvedValue({});
    });

    it('Bug #4: DELIVERED → reversePending (not debitAvailable)', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('DELIVERED'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'DELIVERED' });

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.reversePending).toHaveBeenCalledWith('seller-1', 100, mockTx);
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });

    it('RELEASE_PENDING → debitAvailable', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('RELEASE_PENDING'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'RELEASE_PENDING' });

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.debitAvailable).toHaveBeenCalledWith('seller-1', 100, mockTx);
      expect(mockWallet.reversePending).not.toHaveBeenCalled();
    });

    it('Bug #2: RELEASED → recordSellerDebt', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('RELEASED'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'RELEASED' });

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.recordSellerDebt).toHaveBeenCalledWith('seller-1', 100, mockTx, 'order-1');
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
    });

    it('concurrent refund webhook: count=0 → skips wallet mutations', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('ESCROW_HELD'));
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'ESCROW_HELD' });
      mockTx.order.updateMany.mockResolvedValue({ count: 0 }); // concurrent call already processed

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.reversePending).not.toHaveBeenCalled();
      expect(mockWallet.debitAvailable).not.toHaveBeenCalled();
      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
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
          payments: [{ id: 'pay-1', reference: 'ref-1', status: 'Paid' }],
        });
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      // adminRefundOrder chain: pre-Paystack claim + tx mocks
      mockPrisma.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'ESCROW_HELD' });
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.paymentTransaction.updateMany.mockResolvedValue({});
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
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
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

    it('throws BadRequestException for non-releasable escrow states (pre-check)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ ...escrowOrder, escrowStatus: 'RELEASED' });
      await expect(service.releaseEscrowInternal('order-1')).rejects.toThrow(BadRequestException);
    });

    it('concurrent double-release: count=0 from updateMany → throws BadRequestException, no wallet credit', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(escrowOrder); // ESCROW_HELD passes pre-check
      mockTx.order.updateMany.mockResolvedValue({ count: 0 });   // atomic claim lost to concurrent call

      await expect(service.releaseEscrowInternal('order-1')).rejects.toThrow(BadRequestException);
      expect(mockWallet.pendingToAvailable).not.toHaveBeenCalled();
      expect(mockTx.payout.create).not.toHaveBeenCalled();
    });

    it('uses conditional updateMany WHERE escrowStatus IN releasable states (not unconditional update)', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(escrowOrder);

      await service.releaseEscrowInternal('order-1');

      expect(mockTx.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'order-1', escrowStatus: { in: expect.arrayContaining(['ESCROW_HELD']) } }),
          data:  expect.objectContaining({ escrowStatus: 'RELEASE_PENDING' }),
        }),
      );
      expect(mockTx.order.update).not.toHaveBeenCalled();
    });
  });

  // ─── A1: fundEscrow uses stored commission, never recalculates existing orders ─

  describe('fundEscrow — stored commission source of truth', () => {
    // Helper to call the private fundEscrow method
    const callFundEscrow = (svc: PaymentService, ref: string, paidAt: string, sellerId: string) =>
      (svc as unknown as { fundEscrow: (r: string, p: string, s: string) => Promise<unknown> })
        .fundEscrow(ref, paidAt, sellerId);

    const makePaymentWithOrder = (orderOverrides = {}) => ({
      reference: 'ref-stored',
      status: 'Pending',
      userId: 'buyer-1',
      orderId: 'order-1',
      order: {
        id:           'order-1',
        price:        100,
        totalAmount:  102.50,  // stored at 2.5% — historical value
        platformFee:  2.50,
        sellerAmount: 100,
        escrowStatus: 'PAYMENT_INITIALIZED',
        sellerId:     null,
        ...orderOverrides,
      },
    });

    beforeEach(() => {
      mockTx.order.update.mockResolvedValue({});
      mockTx.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
      mockTx.platformRevenue.upsert.mockResolvedValue({});
      mockWallet.creditPending.mockResolvedValue(undefined);
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);
      mockPrisma.serviceBooking.update.mockResolvedValue({});
    });

    it('uses stored totalAmount/platformFee/sellerAmount even when current config is 3%', async () => {
      // Order was created at 2.5% (historical). Config is now 3%.
      // fundEscrow must NOT recalculate — it must use the stored 2.5% values.
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(
        makePaymentWithOrder({ totalAmount: 102.50, platformFee: 2.50, sellerAmount: 100 }),
      );

      await callFundEscrow(service, 'ref-stored', new Date().toISOString(), 'seller-1');

      // Seller wallet credited with stored sellerAmount (100), not recalculated
      expect(mockWallet.creditPending).toHaveBeenCalledWith('seller-1', 100, mockTx);

      // PlatformRevenue created with stored platformFee (2.50), not current 3%
      expect(mockTx.platformRevenue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ feeAmount: 2.50, sellerAmount: 100, totalAmount: 102.50 }),
        }),
      );

      // Order updated with stored values
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmount: 102.50, platformFee: 2.50, sellerAmount: 100 }),
        }),
      );
    });

    it('uses current config only for legacy orders where totalAmount = 0', async () => {
      // Legacy order predating commission storage
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(
        makePaymentWithOrder({ totalAmount: 0, platformFee: 0, sellerAmount: 0, price: 100 }),
      );

      await callFundEscrow(service, 'ref-stored', new Date().toISOString(), 'seller-1');

      // Config says 3%, so legacy order should calculate at 3%
      expect(mockWallet.creditPending).toHaveBeenCalledWith('seller-1', 100, mockTx);
      expect(mockTx.platformRevenue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ feeAmount: 3, totalAmount: 103 }),
        }),
      );
    });

    it('is idempotent: returns early if payment already Paid (pre-check)', async () => {
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue({
        ...makePaymentWithOrder(),
        status: 'Paid',
      });

      await callFundEscrow(service, 'ref-stored', new Date().toISOString(), 'seller-1');

      expect(mockWallet.creditPending).not.toHaveBeenCalled();
      expect(mockTx.platformRevenue.upsert).not.toHaveBeenCalled();
    });

    it('concurrent double-fund: updateMany count=0 → skips wallet credit and notifications', async () => {
      // Two concurrent charge.success webhooks arrive; both pass the status=Pending pre-check.
      // The first wins the updateMany; the second sees count=0 and returns early without
      // double-crediting the seller wallet.
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(
        makePaymentWithOrder({ totalAmount: 102.50, platformFee: 2.50, sellerAmount: 100 }),
      );
      mockTx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 }); // lost the race

      await callFundEscrow(service, 'ref-stored', new Date().toISOString(), 'seller-1');

      expect(mockWallet.creditPending).not.toHaveBeenCalled();
      expect(mockTx.platformRevenue.upsert).not.toHaveBeenCalled();
      expect(mockTx.order.update).not.toHaveBeenCalled();
    });

    it('uses updateMany with status != Paid as the atomic idempotency guard (not unconditional update)', async () => {
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(
        makePaymentWithOrder({ totalAmount: 102.50, platformFee: 2.50, sellerAmount: 100 }),
      );

      await callFundEscrow(service, 'ref-stored', new Date().toISOString(), 'seller-1');

      expect(mockTx.paymentTransaction.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reference: 'ref-stored', status: { not: 'Paid' } },
          data:  expect.objectContaining({ status: 'Paid' }),
        }),
      );
    });
  });

  // ─── Webhook idempotency ─────────────────────────────────────────────────────

  describe('handleWebhook — idempotency and retry', () => {
    const makeRawBody = (ref: string, event = 'charge.success') =>
      Buffer.from(JSON.stringify({ event, data: { reference: ref, paid_at: new Date().toISOString(), metadata: null } }));

    const callWebhook = (svc: PaymentService, rawBody: Buffer, sig: string) => {
      const { createHmac: ch } = require('node:crypto') as typeof import('node:crypto');
      const secret = 'sk_test_abc123';
      const realSig = ch('sha512', secret).update(rawBody).digest('hex');
      return svc.handleWebhook(rawBody, realSig);
    };

    it('skips processing when an already-processed log exists (true duplicate)', async () => {
      mockPrisma.webhookLog.findFirst.mockResolvedValue({ id: 'log-1', processed: true });

      const rawBody = makeRawBody('ref-dup');
      const secret = 'sk_test_abc123';
      const { createHmac: ch } = require('node:crypto') as typeof import('node:crypto');
      const realSig = ch('sha512', secret).update(rawBody).digest('hex');

      const result = await service.handleWebhook(rawBody, realSig);

      expect(result).toEqual({ received: true });
      expect(mockPrisma.webhookLog.create).not.toHaveBeenCalled();
    });

    it('reuses existing failed log record on retry instead of calling create (P2002 prevention)', async () => {
      // Simulate retry: prior delivery left a processed=false log for the same reference.
      // The service must reuse the existing record and NOT call webhookLog.create.
      const existingFailedLog = { id: 'log-existing', processed: false };
      mockPrisma.webhookLog.findFirst.mockResolvedValue(existingFailedLog);
      mockPrisma.webhookLog.update.mockResolvedValue({});
      // handleChargeSuccess path needs a payment record; return null to exit early.
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);

      const rawBody = makeRawBody('ref-retry');
      const secret = 'sk_test_abc123';
      const { createHmac: ch } = require('node:crypto') as typeof import('node:crypto');
      const realSig = ch('sha512', secret).update(rawBody).digest('hex');

      await service.handleWebhook(rawBody, realSig);

      expect(mockPrisma.webhookLog.create).not.toHaveBeenCalled();
      // Should update the existing log record on success
      expect(mockPrisma.webhookLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'log-existing' } }),
      );
    });

    it('finds existing log without filtering by processed:true (avoids missing failed records)', async () => {
      mockPrisma.webhookLog.findFirst.mockResolvedValue({ id: 'log-1', processed: true });

      const rawBody = makeRawBody('ref-check');
      const secret = 'sk_test_abc123';
      const { createHmac: ch } = require('node:crypto') as typeof import('node:crypto');
      const realSig = ch('sha512', secret).update(rawBody).digest('hex');

      await service.handleWebhook(rawBody, realSig);

      expect(mockPrisma.webhookLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ processed: expect.anything() }),
        }),
      );
    });
  });

  // ─── Seller debt serialization proof ────────────────────────────────────────

  describe('recordSellerDebt serialization — only one caller can win the order claim', () => {
    // Proof: adminRefundOrder and handleRefund both use tx.order.updateMany WHERE escrowStatus NOT IN terminal.
    // The DB serializes the two transactions; only one sees count>0 and reaches recordSellerDebt.
    // This test verifies that the loser (count=0) does NOT call recordSellerDebt.

    const callHandleRefund = (svc: PaymentService, data: Record<string, unknown>) =>
      (svc as unknown as { handleRefund: (d: Record<string, unknown>) => Promise<void> }).handleRefund(data);

    it('handleRefund: count=0 → recordSellerDebt is never called (serialization loser skips all wallet ops)', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: 'order-1', escrowStatus: 'RELEASED', paymentReference: 'ref-1',
        sellerId: 'seller-1', sellerAmount: 100,
      });
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'RELEASED' });
      mockTx.order.updateMany.mockResolvedValue({ count: 0 }); // serialization loser
      mockTx.paymentTransaction.updateMany.mockResolvedValue({});

      await callHandleRefund(service, { transaction_reference: 'ref-1' });

      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });

    it('adminRefundOrder: count=0 in order updateMany → recordSellerDebt is never called', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-1', escrowStatus: 'RELEASED', sellerId: 'seller-1', sellerAmount: 100,
        payments: [{ id: 'pay-1', reference: 'ref-1', status: 'Paid' }],
      });
      mockPrisma.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
      mockTx.order.findUnique.mockResolvedValue({ escrowStatus: 'RELEASED' });
      mockTx.paymentTransaction.updateMany.mockResolvedValue({});
      mockTx.order.updateMany.mockResolvedValue({ count: 0 }); // serialization loser
      mockTx.platformRevenue.updateMany.mockResolvedValue({});

      await service.adminRefundOrder('order-1');

      expect(mockWallet.recordSellerDebt).not.toHaveBeenCalled();
    });
  });

  // ─── retryWebhookLog — webhook stuck-in-error recovery ───────────────────────

  describe('retryWebhookLog (webhook stuck-in-error recovery)', () => {
    const makeLog = (overrides: Record<string, unknown> = {}) => ({
      id: 'log-1',
      processed: false,
      error: 'DB timeout',
      eventType: 'charge.success',
      reference: 'ref-1',
      payload: JSON.stringify({
        event: 'charge.success',
        data: { reference: 'ref-1', paid_at: new Date().toISOString(), metadata: null },
      }),
      ...overrides,
    });

    it('throws NotFoundException for unknown log id', async () => {
      mockPrisma.webhookLog.findUnique.mockResolvedValue(null);
      await expect(service.retryWebhookLog('log-99')).rejects.toThrow(NotFoundException);
    });

    it('returns retried=false without updating when log is already processed', async () => {
      mockPrisma.webhookLog.findUnique.mockResolvedValue(makeLog({ processed: true }));

      const result = await service.retryWebhookLog('log-1');

      expect(result.retried).toBe(false);
      expect(mockPrisma.webhookLog.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when stored payload is not valid JSON', async () => {
      mockPrisma.webhookLog.findUnique.mockResolvedValue(makeLog({ payload: 'not-json' }));
      await expect(service.retryWebhookLog('log-1')).rejects.toThrow(BadRequestException);
    });

    it('marks log processed=true and clears error on successful charge.success retry', async () => {
      mockPrisma.webhookLog.findUnique.mockResolvedValue(makeLog());
      // handleChargeSuccess looks up payment; returning null triggers early return (no wallet ops)
      mockPrisma.paymentTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);
      mockPrisma.webhookLog.update.mockResolvedValue({});

      const result = await service.retryWebhookLog('log-1');

      expect(result.retried).toBe(true);
      expect(mockPrisma.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { processed: true, error: null },
      });
    });

    it('marks log processed=true and clears error on successful transfer.success retry', async () => {
      const payload = JSON.stringify({
        event: 'transfer.success',
        data: { reference: 'CM-PAYOUT-pay-1', transfer_code: 'TC_1' },
      });
      mockPrisma.webhookLog.findUnique.mockResolvedValue(makeLog({ eventType: 'transfer.success', payload }));
      mockPayout.handleTransferSuccess.mockResolvedValue(undefined);
      mockPrisma.webhookLog.update.mockResolvedValue({});

      const result = await service.retryWebhookLog('log-1');

      expect(result.retried).toBe(true);
      expect(mockPayout.handleTransferSuccess).toHaveBeenCalledWith('TC_1', 'CM-PAYOUT-pay-1');
      expect(mockPrisma.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { processed: true, error: null },
      });
    });

    it('updates error with [retry] prefix and re-throws when handler fails again', async () => {
      mockPrisma.webhookLog.findUnique.mockResolvedValue(makeLog());
      mockPrisma.paymentTransaction.findUnique.mockRejectedValue(new Error('DB connection lost'));
      mockPrisma.webhookLog.update.mockResolvedValue({});

      await expect(service.retryWebhookLog('log-1')).rejects.toThrow('DB connection lost');
      expect(mockPrisma.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { error: '[retry] DB connection lost' },
      });
    });

    it('returns retried=false for unknown event type and marks log processed', async () => {
      const payload = JSON.stringify({ event: 'unknown.event', data: { reference: 'ref-1' } });
      mockPrisma.webhookLog.findUnique.mockResolvedValue(makeLog({ eventType: 'unknown.event', payload }));
      mockPrisma.webhookLog.update.mockResolvedValue({});

      const result = await service.retryWebhookLog('log-1');

      expect(result.retried).toBe(false);
      expect(result.message).toContain('No handler');
      expect(mockPrisma.webhookLog.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ processed: true }) }),
      );
    });
  });

  // ─── B: ghsToPesewas — Paystack unit conversion ──────────────────────────────

  describe('ghsToPesewas — Paystack boundary conversion', () => {
    it('converts 0 GHS to 0 pesewas', () => {
      expect(ghsToPesewas(0)).toBe(0);
    });

    it('converts 1 GHS to 100 pesewas', () => {
      expect(ghsToPesewas(1)).toBe(100);
    });

    it('converts 10.50 GHS to 1050 pesewas', () => {
      expect(ghsToPesewas(10.50)).toBe(1050);
    });

    it('rounds 10.505 GHS to a deterministic integer', () => {
      expect(Number.isInteger(ghsToPesewas(10.505))).toBe(true);
    });

    it('converts a typical marketplace total — 102.50 GHS → 10250 pesewas', () => {
      expect(ghsToPesewas(102.50)).toBe(10250);
    });

    it('throws for NaN', () => {
      expect(() => ghsToPesewas(NaN)).toThrow();
    });

    it('throws for Infinity', () => {
      expect(() => ghsToPesewas(Infinity)).toThrow();
    });

    it('throws for negative values', () => {
      expect(() => ghsToPesewas(-1)).toThrow();
    });
  });

  // ─── B: initializeOrderPayment — Paystack receives stored pesewa amount ──────

  describe('initializeOrderPayment — Paystack amount uses stored totalAmount', () => {
    const storedOrder = {
      id:           'order-pay-1',
      buyerId:      'buyer-1',
      price:        100,
      totalAmount:  102.50,  // order stored at 2.5%
      platformFee:  2.50,
      sellerAmount: 100,
      escrowStatus: 'PENDING_PAYMENT',
      buyer:   { id: 'buyer-1', email: 'buyer@test.com' },
      product: { id: 'prod-1', title: 'Widget', sellerId: 'seller-1' },
    };

    it('sends stored totalAmount in pesewas even when current config is 3%', async () => {
      // Config mock returns 3% (set globally in beforeEach).
      // This order was created when the fee was 2.5%, so totalAmount=102.50.
      // initializeOrderPayment must send 10250 pesewas — not 10300 (which would be 3%).
      mockPrisma.order.findUnique.mockResolvedValue(storedOrder);

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: true,
            data: {
              authorization_url: 'https://checkout.paystack.com/abc',
              access_code:       'ac_123',
              reference:         'CM-ref-123',
            },
          }),
      } as unknown as Response);
      global.fetch = fetchSpy;

      // initializeOrderPayment uses array-style $transaction([create, update])
      mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
        if (Array.isArray(ops)) return Promise.all(ops as Promise<unknown>[]);
        return (ops as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
      });
      mockPrisma.paymentTransaction.create.mockResolvedValue({ id: 'tx-1', authorizationUrl: 'https://checkout.paystack.com/abc' });
      mockPrisma.order.update.mockResolvedValue({});

      await service.initializeOrderPayment('order-pay-1', 'buyer-1');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string) as { amount: number; currency: string };
      // 102.50 GHS × 100 = 10250 pesewas (stored 2.5% value — NOT 10300 = 3% of 100)
      expect(body.amount).toBe(10250);
      expect(body.currency).toBe('GHS');
    });

    it('is idempotent: throws BadRequestException if order already paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...storedOrder,
        escrowStatus: 'ESCROW_HELD',
      });

      await expect(service.initializeOrderPayment('order-pay-1', 'buyer-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── runFinancialAudit — read-only discovery ────────────────────────────────

  describe('runFinancialAudit', () => {
    const emptyAuditSetup = () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);
    };

    it('returns empty findings when everything is consistent', async () => {
      emptyAuditSetup();

      const result = await service.runFinancialAudit();

      expect(result.findings).toHaveLength(0);
      expect(result.summary).toEqual({ A: 0, B: 0, C: 0, D: 0 });
      expect(result.runAt).toBeTruthy();
    });

    it('classifies RELEASE_PENDING + COMPLETED payout as category B', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-rp', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-1', status: 'COMPLETED' }] }])
        .mockResolvedValueOnce([]); // RELEASED orders check
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-rp');
      expect(finding?.category).toBe('B');
      expect(finding?.type).toBe('RELEASE_PENDING_PAYOUT_TERMINAL');
      expect(result.summary.B).toBe(1);
    });

    it('classifies RELEASE_PENDING + PENDING payout as category C', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-rp2', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-2', status: 'PENDING' }] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-rp2');
      expect(finding?.category).toBe('C');
      expect(finding?.type).toBe('RELEASE_PENDING_UNPROCESSED_PAYOUT');
    });

    it('classifies RELEASE_PENDING + FAILED payout as category C', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-rpf', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-f', status: 'FAILED' }] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-rpf');
      expect(finding?.category).toBe('C');
      expect(finding?.type).toBe('RELEASE_PENDING_FAILED_PAYOUT');
    });

    it('classifies RELEASE_PENDING + CANCELLED payout as category D', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-rpd', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-c', status: 'CANCELLED' }] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-rpd');
      expect(finding?.category).toBe('D');
      expect(finding?.type).toBe('RELEASE_PENDING_BLOCKED_PAYOUT');
    });

    it('classifies RELEASE_PENDING + no payout as category D', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-rpnp', escrowStatus: 'RELEASE_PENDING', payouts: [] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-rpnp');
      expect(finding?.category).toBe('D');
      expect(finding?.type).toBe('RELEASE_PENDING_NO_PAYOUT');
    });

    it('classifies COMPLETED booking with ESCROW_HELD order as category C', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([{
        id: 'booking-stuck',
        orderId: 'order-stuck',
        order: { escrowStatus: 'ESCROW_HELD' },
      }]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'booking-stuck');
      expect(finding?.category).toBe('C');
      expect(finding?.type).toBe('COMPLETED_BOOKING_ESCROW_HELD');
    });

    it('classifies RELEASED order with COMPLETED payout as category A', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([]) // RELEASE_PENDING orders
        .mockResolvedValueOnce([{ id: 'order-ok', escrowStatus: 'RELEASED', payouts: [{ id: 'p1', status: 'COMPLETED' }] }]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-ok');
      expect(finding?.category).toBe('A');
      expect(result.summary.A).toBe(1);
    });

    it('classifies RELEASED order with no payout as category D', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'order-nop', escrowStatus: 'RELEASED', payouts: [] }]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'order-nop');
      expect(finding?.category).toBe('D');
      expect(finding?.type).toBe('RELEASED_NO_PAYOUT');
    });

    it('classifies failed webhook logs as category C', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([{
        id: 'wh-failed',
        eventType: 'charge.success',
        reference: 'ref-1',
        error: 'DB timeout',
      }]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'wh-failed');
      expect(finding?.category).toBe('C');
      expect(finding?.type).toBe('FAILED_WEBHOOK');
    });

    it('flags wallet balance mismatch (stored vs computed) as category D', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([{
        id: 'wallet-1', userId: 'user-mismatch',
        availableBalance: 100, pendingBalance: 0, totalEarnings: 100, totalWithdrawn: 0,
      }]);
      // Ledger says: PENDING_TO_AVAILABLE = 80 (not 100)
      mockPrisma.walletTransaction.groupBy.mockResolvedValue([
        { walletId: 'wallet-1', type: 'PENDING_TO_AVAILABLE', _sum: { amount: 80 } },
      ]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.type === 'WALLET_BALANCE_MISMATCH');
      expect(finding?.category).toBe('D');
      expect(finding?.entityId).toBe('user-mismatch');
      expect(finding?.description).toContain('availableBalance');
    });

    it('regression: hairdressing booking fixed by reconcile — RELEASED+COMPLETED payout — appears only as Category A, no action-needed findings', async () => {
      // Represents the two hairdressing bookings that were stuck in ESCROW_HELD, fixed by
      // reconcileServiceBookings(), and are now RELEASED with COMPLETED payouts.
      // The audit MUST classify them as Category A only — they are financially correct.
      // They must NOT appear in Check 2 (stuck escrow) because their order is RELEASED.
      mockPrisma.order.findMany
        .mockResolvedValueOnce([])   // Check 1: no RELEASE_PENDING orders
        .mockResolvedValueOnce([{    // Check 3: RELEASED orders
          id: 'order-hairdressing-fixed',
          escrowStatus: 'RELEASED',
          payouts: [{ id: 'payout-completed', status: 'COMPLETED' }],
        }]);
      // Check 2 queries serviceBooking WHERE escrowStatus IN stuck list.
      // order is RELEASED — DB correctly excludes it → empty result.
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      // Appears exactly once, as Category A — not a B/C/D finding
      const forOrder = result.findings.filter(f => f.entityId === 'order-hairdressing-fixed');
      expect(forOrder).toHaveLength(1);
      expect(forOrder[0].category).toBe('A');
      expect(forOrder[0].type).toBe('RELEASED_CORRECT');
      // Confirm: no action-needed findings at all for this scenario
      expect(result.summary).toEqual({ A: 1, B: 0, C: 0, D: 0 });
    });

    it('regression: CANCELLED booking with ESCROW_HELD order — coverage gap — appears as Category D (not invisible)', async () => {
      // A service booking cancelled after the buyer already paid. The escrow is still
      // ESCROW_HELD and no refund has been initiated. Previously invisible to the audit.
      // Check 2b must catch this and report Category D (manual review: refund buyer).
      mockPrisma.order.findMany.mockResolvedValue([]); // no RELEASE_PENDING, no RELEASED
      mockPrisma.serviceBooking.findMany
        .mockResolvedValueOnce([])   // Check 2: COMPLETED bookings — none
        .mockResolvedValueOnce([{    // Check 2b: CANCELLED bookings with active escrow
          id: 'booking-cancelled-paid',
          status: 'CANCELLED',
          orderId: 'order-photoshoot',
          order: { escrowStatus: 'ESCROW_HELD' },
        }]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.runFinancialAudit();

      const finding = result.findings.find(f => f.entityId === 'booking-cancelled-paid');
      expect(finding).toBeDefined();
      expect(finding?.category).toBe('D');
      expect(finding?.type).toBe('CANCELLED_BOOKING_ESCROW_HELD');
      expect(finding?.description).toContain('order-photoshoot');
      expect(finding?.suggestedAction).toContain('refund');
      expect(result.summary.D).toBe(1);
    });

    it('does NOT flag wallet when stored values match ledger', async () => {
      // Wallet state: seller earned 100 (CREDIT_PENDING→PENDING_TO_AVAILABLE), all now available.
      // pendingBalance=0, availableBalance=100, totalEarnings=100, totalWithdrawn=0
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([{
        id: 'wallet-2', userId: 'user-ok',
        availableBalance: 100, pendingBalance: 0, totalEarnings: 100, totalWithdrawn: 0,
      }]);
      // Ledger: CREDIT_PENDING=100, PENDING_TO_AVAILABLE=100 → pending=0, available=100, earnings=100, withdrawn=0
      mockPrisma.walletTransaction.groupBy.mockResolvedValue([
        { walletId: 'wallet-2', type: 'CREDIT_PENDING',        _sum: { amount: 100 } },
        { walletId: 'wallet-2', type: 'PENDING_TO_AVAILABLE',  _sum: { amount: 100 } },
      ]);

      const result = await service.runFinancialAudit();

      const mismatch = result.findings.find(f => f.type === 'WALLET_BALANCE_MISMATCH');
      expect(mismatch).toBeUndefined();
    });
  });

  // ─── applyAuditFixes — B and C fixes, D skipped ─────────────────────────────

  describe('applyAuditFixes', () => {
    const emptyAuditSetup = () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);
    };

    it('returns empty arrays when audit finds no inconsistencies', async () => {
      emptyAuditSetup();

      const result = await service.applyAuditFixes();

      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('B fix: patches RELEASE_PENDING → RELEASED when payout is COMPLETED', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-b', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'p1', status: 'COMPLETED' }] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.applyAuditFixes();

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-b', escrowStatus: 'RELEASE_PENDING' }, data: { escrowStatus: 'RELEASED', status: 'Completed' } }),
      );
      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].action).toContain('RELEASED');
    });

    it('C fix: calls processPayout for PENDING payout on RELEASE_PENDING order', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-c', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-c', status: 'PENDING' }] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);
      // applyAuditFixes re-fetches the order to get fresh payout state
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-c', payouts: [{ id: 'payout-c', status: 'PENDING' }],
      });

      const result = await service.applyAuditFixes();

      expect(mockPayout.processPayout).toHaveBeenCalledWith('payout-c');
      expect(result.applied[0].action).toContain('payout-c');
    });

    it('D finding: skipped with reason, no financial ops performed', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'order-d', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'p-cancel', status: 'CANCELLED' }] }])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.applyAuditFixes();

      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].category).toBe('D');
      expect(result.applied).toHaveLength(0);
      expect(mockPayout.processPayout).not.toHaveBeenCalled();
    });

    it('error during fix: records in errors array without propagating, continues to next finding', async () => {
      // Two findings: first C (processPayout will throw), second B (updateMany should still run)
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          { id: 'order-err', escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-err', status: 'PENDING' }] },
          { id: 'order-b2',  escrowStatus: 'RELEASE_PENDING', payouts: [{ id: 'payout-done', status: 'COMPLETED' }] },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
      mockPrisma.paymentTransaction.findMany.mockResolvedValue([]);
      mockPrisma.payout.findMany.mockResolvedValue([]);
      mockPrisma.webhookLog.findMany.mockResolvedValue([]);
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      // First finding: re-fetch returns PENDING payout, processPayout throws
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-err', payouts: [{ id: 'payout-err', status: 'PENDING' }] });
      mockPayout.processPayout.mockRejectedValue(new Error('Paystack down'));
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.applyAuditFixes();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].entityId).toBe('order-err');
      // B fix for the second order should still run
      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].entityId).toBe('order-b2');
    });
  });

  // ─── reconcileServiceBookings — safe reconcile for stale escrow ──────────────

  describe('reconcileServiceBookings', () => {
    const makeBooking = (escrowStatus: string, payoutStatus?: string) => ({
      id:      'booking-1',
      orderId: 'order-1',
      order: {
        id: 'order-1',
        escrowStatus,
        payouts: payoutStatus
          ? [{ id: 'payout-1', status: payoutStatus }]
          : [],
      },
    });

    const escrowOrder = {
      id:           'order-1',
      escrowStatus: 'ESCROW_HELD',
      sellerId:     'seller-1',
      sellerAmount: 100,
      price:        100,
      buyerId:      'buyer-1',
      product: {
        sellerId:    'seller-1',
        listingType: 'service',
        seller: { name: 'Bob', business: { momoProvider: 'mtn', momoPhone: '0241234567' } },
      },
    };

    beforeEach(() => {
      mockTx.order.updateMany.mockResolvedValue({ count: 1 });
      mockTx.payout.create.mockResolvedValue({ id: 'payout-1' });
      mockWallet.pendingToAvailable.mockResolvedValue(undefined);
      mockPayout.processPayout.mockResolvedValue(undefined);
      mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.payout.update.mockResolvedValue({});
    });

    it('returns empty result when no stuck bookings exist', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);

      const result = await service.reconcileServiceBookings();

      expect(result).toEqual({ checked: 0, fixed: 0, skipped: [], details: [] });
    });

    it('ESCROW_HELD: calls releaseEscrowInternal and counts as fixed', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('ESCROW_HELD')]);
      mockPrisma.order.findUnique.mockResolvedValue(escrowOrder);
      const spy = jest.spyOn(service, 'releaseEscrowInternal').mockResolvedValue({
        message: 'Delivery confirmed. Funds are being released to the seller.',
      });

      const result = await service.reconcileServiceBookings();

      expect(spy).toHaveBeenCalledWith('order-1');
      expect(result.fixed).toBe(1);
      expect(result.skipped).toHaveLength(0);
    });

    it('RELEASE_PENDING + COMPLETED payout: state-only order patch, no processPayout call', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('RELEASE_PENDING', 'COMPLETED')]);

      const result = await service.reconcileServiceBookings();

      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-1', escrowStatus: 'RELEASE_PENDING' },
        data:  { escrowStatus: 'RELEASED', status: 'Completed' },
      });
      expect(mockPayout.processPayout).not.toHaveBeenCalled();
      expect(result.fixed).toBe(1);
    });

    it('RELEASE_PENDING + PENDING payout: calls processPayout directly', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('RELEASE_PENDING', 'PENDING')]);

      const result = await service.reconcileServiceBookings();

      expect(mockPayout.processPayout).toHaveBeenCalledWith('payout-1');
      expect(mockPrisma.payout.update).not.toHaveBeenCalled();
      expect(result.fixed).toBe(1);
    });

    it('RELEASE_PENDING + FAILED payout: resets payout to PENDING then calls processPayout', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('RELEASE_PENDING', 'FAILED')]);

      const result = await service.reconcileServiceBookings();

      expect(mockPrisma.payout.update).toHaveBeenCalledWith({
        where: { id: 'payout-1' },
        data:  { status: 'PENDING', failureReason: null, transferCode: null },
      });
      expect(mockPayout.processPayout).toHaveBeenCalledWith('payout-1');
      expect(result.fixed).toBe(1);
    });

    it('RELEASE_PENDING + no payout: adds to skipped with manual-review reason', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('RELEASE_PENDING')]);

      const result = await service.reconcileServiceBookings();

      expect(result.fixed).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toMatch(/no payout/i);
    });

    it('RELEASE_PENDING + PROCESSING payout: skipped (webhook or admin should handle)', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('RELEASE_PENDING', 'PROCESSING')]);

      const result = await service.reconcileServiceBookings();

      expect(mockPayout.processPayout).not.toHaveBeenCalled();
      expect(result.fixed).toBe(0);
      expect(result.skipped[0].reason).toMatch(/PROCESSING/);
    });

    it('DISPUTED: skipped with resolve-dispute-first reason', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('DISPUTED')]);

      const result = await service.reconcileServiceBookings();

      expect(result.fixed).toBe(0);
      expect(result.skipped[0].reason).toMatch(/DISPUTED/i);
    });

    it('error during release: counts as skipped with error message, does not propagate', async () => {
      mockPrisma.serviceBooking.findMany.mockResolvedValue([makeBooking('ESCROW_HELD')]);
      jest.spyOn(service, 'releaseEscrowInternal').mockRejectedValue(new Error('DB gone'));

      const result = await service.reconcileServiceBookings();

      expect(result.fixed).toBe(0);
      expect(result.skipped[0].reason).toMatch(/DB gone/);
    });
  });
});
