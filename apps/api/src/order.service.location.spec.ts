import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderService } from './order.service';
import { PrismaService } from './prisma.service';

const mockPrisma = {
  order: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  deliveryTracking: { upsert: jest.fn() },
  user: { findFirst: jest.fn() },
  product: { findUnique: jest.fn() },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'MARKETPLACE_FEE_PERCENT') return '3';
    if (key === 'MARKETPLACE_FEE_FLAT')    return '0';
    return undefined;
  }),
};

const makeOrder = (overrides: object = {}) => ({
  id: 'order-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  deliveryPersonId: null,
  deliveryMethod: 'SELLER_DELIVERY',
  status: 'Out for delivery',
  product: { sellerId: 'seller-1' },
  ...overrides,
});

describe('OrderService — updateDeliveryLocation authorization', () => {
  let service: OrderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.deliveryTracking.upsert.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: ConfigService,  useValue: mockConfig },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('throws NotFoundException when order does not exist', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await expect(service.updateDeliveryLocation('order-1', 'seller-1', 5, 0))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows seller to update location for SELLER_DELIVERY order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateDeliveryLocation('order-1', 'seller-1', 5.6, -0.2))
      .resolves.not.toThrow();
    expect(mockPrisma.deliveryTracking.upsert).toHaveBeenCalledTimes(1);
  });

  it('allows assigned delivery person to update location for ASSIGNED_PERSON order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      makeOrder({ deliveryMethod: 'ASSIGNED_PERSON', deliveryPersonId: 'rider-1', product: { sellerId: 'seller-1' } })
    );
    await expect(service.updateDeliveryLocation('order-1', 'rider-1', 5.6, -0.2))
      .resolves.not.toThrow();
    expect(mockPrisma.deliveryTracking.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects a different seller trying to update a SELLER_DELIVERY order they do not own', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateDeliveryLocation('order-1', 'seller-2', 5, 0))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects the buyer trying to update delivery location', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateDeliveryLocation('order-1', 'buyer-1', 5, 0))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unrelated user trying to update delivery location', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateDeliveryLocation('order-1', 'attacker-99', 5, 0))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a rider assigned to a DIFFERENT order from updating this one', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      makeOrder({ deliveryMethod: 'ASSIGNED_PERSON', deliveryPersonId: 'rider-1', product: { sellerId: 'seller-1' } })
    );
    // rider-2 is assigned to a different order, not this one
    await expect(service.updateDeliveryLocation('order-1', 'rider-2', 5, 0))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects SELLER_DELIVERY seller from updating an ASSIGNED_PERSON order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(
      makeOrder({ deliveryMethod: 'ASSIGNED_PERSON', deliveryPersonId: 'rider-1', product: { sellerId: 'seller-1' } })
    );
    // seller can't masquerade as a delivery person when deliveryMethod is ASSIGNED_PERSON
    await expect(service.updateDeliveryLocation('order-1', 'seller-1', 5, 0))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('OrderService — updateBuyerLocation authorization', () => {
  let service: OrderService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.deliveryTracking.upsert.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: ConfigService,  useValue: mockConfig },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('allows the buyer to update their location', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateBuyerLocation('order-1', 'buyer-1', 5.6, -0.2))
      .resolves.toEqual({ ok: true });
  });

  it('rejects seller trying to update buyer location', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateBuyerLocation('order-1', 'seller-1', 5.6, -0.2))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unrelated user trying to update buyer location', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(makeOrder());
    await expect(service.updateBuyerLocation('order-1', 'attacker-99', 5.6, -0.2))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
