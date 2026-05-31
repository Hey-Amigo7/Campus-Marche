import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EscrowStatus } from '@prisma/client';
import { calculateCommission } from './commission.engine';
import { PrismaService } from './prisma.service';
import type { NotificationService } from './notification.service';
import type { ChatGateway } from './chat.gateway';

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
    const feePercent = parseFloat(this.config.get<string>('MARKETPLACE_FEE_PERCENT') ?? '1');
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

    const updated = await this.prisma.order.update({ where: { id }, data: { status: newStatus } });

    const notifyId = isBuyer ? order.product.sellerId : order.buyerId;
    const actor = isBuyer ? 'Buyer' : 'Seller';
    this.notificationService
      ?.notify(notifyId, 'order_status', 'Order updated', `${actor} changed the order status to "${newStatus}".`)
      .catch(() => undefined);

    return updated;
  }

  async assignDeliveryPerson(orderId: string, requesterId: string, deliveryPersonId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { sellerId: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.product.sellerId !== requesterId) throw new ForbiddenException('Only the seller can assign a delivery person');
    if (!['In progress'].includes(order.status)) throw new BadRequestException('Can only assign delivery for orders in progress');

    const deliveryPerson = await this.prisma.user.findUnique({ where: { id: deliveryPersonId } });
    if (!deliveryPerson) throw new NotFoundException('Delivery person not found');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryPersonId, status: 'Out for delivery' },
    });
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
            latitude: order.tracking.latitude,
            longitude: order.tracking.longitude,
            heading: order.tracking.heading,
            speed: order.tracking.speed,
            updatedAt: order.tracking.updatedAt,
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
