import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const ALLOWED_BUYER_TRANSITIONS: Record<string, string[]> = {
  'Payment pending': [],
  'In progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

const ALLOWED_SELLER_TRANSITIONS: Record<string, string[]> = {
  'Payment pending': ['Cancelled'],
  'In progress': ['Completed'],
  Completed: [],
  Cancelled: [],
};

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

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
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const isBuyer = order.buyerId === userId;
    const isSeller = order.product.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return { ...order, role: isBuyer ? 'buyer' : 'seller' };
  }

  async create(data: { buyerId: string; productId: string }) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId, active: true },
      select: { id: true, price: true, sellerId: true },
    });

    if (!product) throw new NotFoundException('Product not found or no longer available');
    if (product.sellerId === data.buyerId) throw new BadRequestException('You cannot buy your own listing');

    return this.prisma.order.create({
      data: { buyerId: data.buyerId, productId: data.productId, price: product.price },
    });
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

    return this.prisma.order.update({ where: { id }, data: { status: newStatus } });
  }
}
