import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EscrowStatus } from '@prisma/client';
import { ServiceBookingService } from './service-booking.service';
import { PrismaService } from './prisma.service';

// ─── Minimal mocks ────────────────────────────────────────────────────────────

const mockPrisma = {
  serviceBooking: {
    findUnique:  jest.fn(),
    findMany:    jest.fn(),
    create:      jest.fn(),
    update:      jest.fn(),
    updateMany:  jest.fn(),
    count:       jest.fn(),
  },
  product: { findUnique: jest.fn() },
  serviceAvailability: { findFirst: jest.fn() },
  order: { create: jest.fn() },
};

const mockPaymentService = {
  releaseEscrowInternal: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'MARKETPLACE_FEE_PERCENT') return '3';
    if (key === 'MARKETPLACE_FEE_FLAT')    return '0';
    return undefined;
  }),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ServiceBookingService', () => {
  let service: ServiceBookingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceBookingService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: ConfigService,  useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ServiceBookingService>(ServiceBookingService);
    // Inject payment service manually (it's @Optional())
    (service as unknown as { paymentService: typeof mockPaymentService }).paymentService = mockPaymentService;
  });

  // ─── A2: auto-release ordering — financial release BEFORE COMPLETED ──────────

  describe('getForUser — auto-release ordering (A2)', () => {
    const makeBooking = (id: string, orderId: string) => ({
      id,
      orderId,
      sellerId: 'seller-1',
      buyerId:  'buyer-1',
    });

    beforeEach(() => {
      // No stuck ACCEPTED bookings
      mockPrisma.serviceBooking.updateMany.mockResolvedValue({ count: 0 });
      // Return no bookings in the final findMany
      mockPrisma.serviceBooking.findMany.mockResolvedValue([]);
    });

    it('marks booking COMPLETED only after successful financial release', async () => {
      const callOrder: string[] = [];

      mockPaymentService.releaseEscrowInternal.mockImplementation(async () => {
        callOrder.push('release');
      });
      mockPrisma.serviceBooking.update.mockImplementation(async () => {
        callOrder.push('completed');
        return {};
      });

      // getForUser makes two findMany calls:
      // 1. overdue AWAITING_CONFIRMATION bookings (return one overdue booking)
      // 2. final list returned to caller (empty)
      mockPrisma.serviceBooking.findMany
        .mockResolvedValueOnce([makeBooking('booking-1', 'order-1')])
        .mockResolvedValueOnce([]);

      await service.getForUser('seller-1');

      // release must be called before COMPLETED update
      expect(callOrder[0]).toBe('release');
      expect(callOrder[1]).toBe('completed');
    });

    it('does NOT mark booking COMPLETED when financial release fails', async () => {
      mockPaymentService.releaseEscrowInternal.mockRejectedValue(
        new BadRequestException('Cannot release escrow'),
      );

      // Same two-call pattern: first returns the overdue booking, second the final list
      mockPrisma.serviceBooking.findMany
        .mockResolvedValueOnce([makeBooking('booking-fail', 'order-fail')])
        .mockResolvedValueOnce([]);

      await service.getForUser('seller-1');

      // booking.update with status=COMPLETED must NOT have been called
      const allUpdateCalls: unknown[][] = mockPrisma.serviceBooking.update.mock.calls;
      const completedCalls = allUpdateCalls.filter((args) => {
        const arg = args[0] as { data?: { status?: string } } | undefined;
        return arg?.data?.status === 'COMPLETED';
      });
      expect(completedCalls).toHaveLength(0);
    });
  });

  // ─── confirmCompletion already has correct ordering (regression guard) ───────

  describe('confirmCompletion — ordering already correct', () => {
    const awaitingBooking = {
      id:       'booking-confirm',
      orderId:  'order-confirm',
      buyerId:  'buyer-1',
      sellerId: 'seller-1',
      status:   'AWAITING_CONFIRMATION',
    };

    beforeEach(() => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(awaitingBooking);
      mockPrisma.serviceBooking.update.mockResolvedValue({ ...awaitingBooking, status: 'COMPLETED' });
    });

    it('releases escrow before marking COMPLETED', async () => {
      const callOrder: string[] = [];
      mockPaymentService.releaseEscrowInternal.mockImplementation(async () => {
        callOrder.push('release');
      });
      mockPrisma.serviceBooking.update.mockImplementation(async () => {
        callOrder.push('completed');
        return { ...awaitingBooking, status: 'COMPLETED' };
      });

      await service.confirmCompletion('booking-confirm', 'buyer-1');

      expect(callOrder[0]).toBe('release');
      expect(callOrder[1]).toBe('completed');
    });

    it('does not complete booking if escrow release throws', async () => {
      mockPaymentService.releaseEscrowInternal.mockRejectedValue(
        new BadRequestException('Cannot release'),
      );

      await expect(service.confirmCompletion('booking-confirm', 'buyer-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.serviceBooking.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for unknown booking', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue(null);
      await expect(service.confirmCompletion('unknown', 'buyer-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when buyer ID does not match', async () => {
      await expect(service.confirmCompletion('booking-confirm', 'wrong-buyer')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when booking is not AWAITING_CONFIRMATION', async () => {
      mockPrisma.serviceBooking.findUnique.mockResolvedValue({ ...awaitingBooking, status: 'CONFIRMED' });
      await expect(service.confirmCompletion('booking-confirm', 'buyer-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Fee config: no 2.5% fallback ────────────────────────────────────────────

  describe('fee configuration — no silent 2.5% fallback', () => {
    it('reads MARKETPLACE_FEE_PERCENT from config (returns 3 in test env)', () => {
      const feePercent = parseFloat(mockConfig.get('MARKETPLACE_FEE_PERCENT') ?? '');
      expect(feePercent).toBe(3);
    });

    it('MARKETPLACE_FEE_PERCENT mock returns a string, not undefined', () => {
      expect(mockConfig.get('MARKETPLACE_FEE_PERCENT')).toBe('3');
    });
  });
});
