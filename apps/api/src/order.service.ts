import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscrowStatus } from '@prisma/client';
import { calculateCommission, generateVerificationCode } from './commission.engine';
import { PrismaService } from './prisma.service';
import type { NotificationService } from './notification.service';
import type { ChatGateway } from './chat.gateway';
import type { PaymentService } from './payment.service';

// Buyer may cancel unpaid orders; delivery confirmation goes through PaymentService.releaseEscrow
const ALLOWED_BUYER_TRANSITIONS: Record<string, string[]> = {
  'Awaiting payment': ['Cancelled'],
  'In progress':      ['Cancelled'],
  'Out for delivery': [],
  Completed:          [],
  Cancelled:          [],
};

// Seller can mark shipping stages; payment/escrow transitions are handled by PaymentService
const ALLOWED_SELLER_TRANSITIONS: Record<string, string[]> = {
  'Awaiting payment': ['Cancelled'],
  'In progress':      ['Out for delivery', 'Cancelled'],
  'Out for delivery': ['Delivered'],
  Delivered:          [],
  Completed:          [],
  Cancelled:          [],
};

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private chatGateway?: ChatGateway,
    @Optional() private paymentService?: PaymentService,
  ) {}

  async getForUser(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { OR: [{ buyerId: userId }, { product: { sellerId: userId } }] },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            imageUrl: true,
            location: true,
            imageStyle: true,
            seller: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return orders.map((order) => {
      const isBuyer = order.buyerId === userId;
      return {
        ...order,
        meetupLocation: order.product.location,
        counterpart: isBuyer ? order.product.seller.name : order.buyer.name,
        counterpartId: isBuyer ? order.product.seller.id : order.buyer.id,
        role: isBuyer ? 'buyer' : 'seller',
      };
    });
  }

  async getByIdForUser(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            imageUrl: true,
            location: true,
            imageStyle: true,
            sellerId: true,
            seller: { select: { id: true, name: true } },
          },
        },
        tracking: true,
        deliveryPerson: { select: { id: true, name: true, avatar: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product.sellerId === userId;
    const isDelivery = order.deliveryPersonId === userId;

    if (!isBuyer && !isSeller && !isDelivery) {
      throw new ForbiddenException('You can only view your own orders');
    }

    const role: 'buyer' | 'seller' | 'delivery' = isBuyer ? 'buyer' : isSeller ? 'seller' : 'delivery';

    return {
      ...order,
      role,
      meetupLocation: order.product.location,
      counterpart: isBuyer ? order.product.seller.name : order.buyer.name,
      counterpartId: isBuyer ? order.product.seller.id : order.buyer.id,
      // Verification codes: only visible to the authorised party
      pickupCode:         isSeller ? order.pickupCode         : undefined,
      pickupCodeExpires:  isSeller ? order.pickupCodeExpires  : undefined,
      deliveryCode:       isBuyer  ? order.deliveryCode       : undefined,
      deliveryCodeExpires: isBuyer ? order.deliveryCodeExpires : undefined,
    };
  }

  async create(data: { buyerId: string; productId: string }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId, active: true },
      select: { id: true, price: true, sellerId: true },
    });

    if (!product) throw new NotFoundException('Product not found or no longer available');
    if (product.sellerId === data.buyerId) throw new BadRequestException('You cannot buy your own listing');

    // Calculate commission at order-creation time so amounts are locked in
    const feePercent = parseFloat(this.config.get<string>('MARKETPLACE_FEE_PERCENT') ?? '2.5');
    const feeFixed   = parseFloat(this.config.get<string>('MARKETPLACE_FEE_FLAT')    ?? '0');
    const commission = calculateCommission(product.price, feePercent, feeFixed);

    const order = await this.prisma.order.create({
      data: {
        buyerId:      data.buyerId,
        productId:    data.productId,
        sellerId:     product.sellerId,
        price:        product.price,
        totalAmount:  commission.totalAmount,
        platformFee:  commission.platformFee,
        sellerAmount: commission.sellerAmount,
        escrowStatus: EscrowStatus.PENDING_PAYMENT,
        status:       'Awaiting payment',
      },
      include: { product: { select: { title: true, sellerId: true } } },
    });

    this.notificationService
      ?.notify(product.sellerId, 'order', 'New order received', `Someone placed an order for "${order.product.title}".`)
      .catch(() => undefined);

    return order;
  }

  async updateStatus(id: string, userId: string, newStatus: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { product: { select: { sellerId: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product.sellerId === userId;

    if (!isBuyer && !isSeller) throw new ForbiddenException('You can only update your own orders');

    const allowedTransitions = isBuyer
      ? ALLOWED_BUYER_TRANSITIONS[order.status]
      : ALLOWED_SELLER_TRANSITIONS[order.status];

    if (!allowedTransitions?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${newStatus}" as ${isBuyer ? 'buyer' : 'seller'}`,
      );
    }

    // Sync escrow state with delivery milestones so the timeline advances correctly
    const escrowSync: Partial<Record<string, EscrowStatus>> = {
      'Out for delivery': EscrowStatus.SHIPPED,
      'Delivered':        EscrowStatus.DELIVERED,
    };
    const newEscrow = escrowSync[newStatus];

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: newStatus, ...(newEscrow ? { escrowStatus: newEscrow } : {}) },
    });

    const notifyId = isBuyer ? order.product.sellerId : order.buyerId;
    const actor = isBuyer ? 'Buyer' : 'Seller';
    this.notificationService
      ?.notify(notifyId, 'order_status', 'Order updated', `${actor} changed the order status to "${newStatus}".`)
      .catch(() => undefined);

    return updated;
  }

  async assignDeliveryPerson(orderId: string, requesterId: string, identifier: string, name?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { sellerId: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.product.sellerId !== requesterId) throw new ForbiddenException('Only the seller can assign a delivery person');
    if (!['In progress'].includes(order.status)) throw new BadRequestException('Can only assign delivery for orders in progress');

    const contact = identifier.trim();

    // Try to find a registered Campus Marche user by email or phone
    const registeredUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: contact.toLowerCase() }, { phone: contact }, { id: contact }] },
    });

    // Generate pickup code (12h expiry) — delivery person must enter this to start delivery
    const pickupCode = generateVerificationCode();
    const pickupCodeExpires = new Date(Date.now() + 12 * 60 * 60 * 1000);

    if (registeredUser) {
      // Link to registered account — clears any previous external contact
      return this.prisma.order.update({
        where: { id: orderId },
        data: {
          deliveryPersonId:        registeredUser.id,
          externalDeliveryName:    null,
          externalDeliveryContact: null,
          pickupCode,
          pickupCodeExpires,
          pickupVerifiedAt:        null,
          // Status stays "In progress" until delivery person verifies the pickup code
        },
      });
    }

    // External contact — store their info, advance status directly (no app-based code entry)
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPersonId:        null,
        externalDeliveryName:    name?.trim() || null,
        externalDeliveryContact: contact,
        status: 'Out for delivery',
        escrowStatus: EscrowStatus.SHIPPED,
      },
    });
  }

  async verifyPickupCode(orderId: string, deliveryPersonId: string, code: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryPersonId !== deliveryPersonId) {
      throw new ForbiddenException('You are not the assigned delivery person for this order');
    }
    if (!order.pickupCode) throw new BadRequestException('No pickup code has been generated for this order');
    if (order.pickupVerifiedAt) throw new BadRequestException('Pickup has already been verified');
    if (order.pickupCodeExpires && order.pickupCodeExpires < new Date()) {
      throw new BadRequestException('Pickup code has expired — ask the seller to re-assign the delivery person');
    }
    if (order.pickupCode !== code.toUpperCase().trim()) {
      throw new BadRequestException('Invalid pickup code');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        pickupVerifiedAt: new Date(),
        status: 'Out for delivery',
        escrowStatus: EscrowStatus.SHIPPED,
      },
    });

    this.notificationService
      ?.notify(order.buyerId, 'order_status', 'Order picked up', 'Your order has been collected by the delivery person and is on the way.')
      .catch(() => undefined);

    this.chatGateway?.emitOrderUpdated(orderId, { escrowStatus: EscrowStatus.SHIPPED, paymentStatus: 'Paid' });

    return updated;
  }

  async verifyDeliveryCode(orderId: string, deliveryPersonId: string, code: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryPersonId !== deliveryPersonId) {
      throw new ForbiddenException('You are not the assigned delivery person for this order');
    }
    if (!order.deliveryCode) throw new BadRequestException('No delivery code found for this order');
    if (order.deliveryVerifiedAt) throw new BadRequestException('Delivery has already been verified');
    if (order.deliveryCodeExpires && order.deliveryCodeExpires < new Date()) {
      throw new BadRequestException('Delivery code has expired — the buyer must request a new order');
    }
    if (order.deliveryCode !== code.toUpperCase().trim()) {
      throw new BadRequestException('Invalid delivery code');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryVerifiedAt: new Date(), escrowStatus: EscrowStatus.DELIVERED, status: 'Delivered' },
    });

    // Trigger escrow release
    if (this.paymentService) {
      await this.paymentService.releaseEscrowInternal(orderId);
    }

    return { message: 'Delivery verified. Payment is being released to the seller.' };
  }

  async disputeOrder(orderId: string, userId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { sellerId: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product.sellerId === userId;
    if (!isBuyer && !isSeller) throw new ForbiddenException('Only the buyer or seller can dispute this order');

    const disputeableStates = ['ESCROW_HELD', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (!disputeableStates.includes(order.escrowStatus)) {
      throw new BadRequestException('This order cannot be disputed in its current state');
    }
    if (order.escrowStatus === 'DISPUTED') throw new BadRequestException('Order is already under dispute');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        escrowStatus: EscrowStatus.DISPUTED,
        status: 'Disputed',
        disputeReason: reason,
        disputedAt: new Date(),
      },
    });

    const notifyId = isBuyer ? order.product.sellerId : order.buyerId;
    const actor = isBuyer ? 'Buyer' : 'Seller';
    this.notificationService
      ?.notify(notifyId, 'dispute', 'Order disputed', `${actor} has raised a dispute: "${reason.slice(0, 80)}..."`)
      .catch(() => undefined);

    this.chatGateway?.emitOrderUpdated(orderId, { escrowStatus: 'DISPUTED', paymentStatus: 'Paid' });

    return updated;
  }

  async updateDeliveryLocation(
    orderId: string,
    deliveryPersonId: string,
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryPersonId !== deliveryPersonId) {
      throw new ForbiddenException('You are not the assigned delivery person for this order');
    }

    const result = await this.prisma.deliveryTracking.upsert({
      where: { orderId },
      create: { orderId, latitude, longitude, heading, speed },
      update: { latitude, longitude, heading, speed },
    });

    // Push live update to anyone watching the order room
    this.chatGateway?.emitDeliveryLocation(orderId, latitude, longitude, heading, speed);

    return result;
  }

  async updateBuyerLocation(orderId: string, buyerId: string, latitude: number, longitude: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Only the buyer can share their location');

    await this.prisma.deliveryTracking.upsert({
      where: { orderId },
      create: {
        orderId,
        latitude: 0, longitude: 0, // placeholder — delivery person hasn't started yet
        buyerLatitude: latitude,
        buyerLongitude: longitude,
        buyerLocationUpdatedAt: new Date(),
      },
      update: {
        buyerLatitude: latitude,
        buyerLongitude: longitude,
        buyerLocationUpdatedAt: new Date(),
      },
    });

    this.chatGateway?.emitBuyerLocation(orderId, latitude, longitude);
    return { ok: true };
  }

  async getDeliveryTracking(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tracking: true,
        product: { select: { sellerId: true } },
        deliveryPerson: { select: { id: true, name: true, avatar: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product.sellerId === userId;
    const isDeliveryPerson = order.deliveryPersonId === userId;

    if (!isBuyer && !isSeller && !isDeliveryPerson) {
      throw new ForbiddenException('Access denied');
    }

    return {
      orderId,
      status: order.status,
      deliveryAddress: order.deliveryAddress,
      deliveryPhone: order.deliveryPhone,
      deliveryPerson: order.deliveryPerson,
      tracking: order.tracking
        ? {
            latitude:  order.tracking.latitude,
            longitude: order.tracking.longitude,
            heading:   order.tracking.heading,
            speed:     order.tracking.speed,
            updatedAt: order.tracking.updatedAt,
          }
        : null,
      buyerLocation: order.tracking?.buyerLatitude != null
        ? {
            latitude:  order.tracking.buyerLatitude,
            longitude: order.tracking.buyerLongitude!,
            updatedAt: order.tracking.buyerLocationUpdatedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  async setDeliveryDetails(orderId: string, buyerId: string, deliveryAddress: string, deliveryPhone: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Only the buyer can set delivery details');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryAddress, deliveryPhone },
    });
  }
}
