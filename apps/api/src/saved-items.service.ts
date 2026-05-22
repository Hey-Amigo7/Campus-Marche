import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SavedItemsService {
  constructor(private prisma: PrismaService) {}

  async getForUser(userId: string) {
    const items = await this.prisma.savedItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            seller: { select: { id: true, name: true, avatar: true, verified: true, premium: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => item.product);
  }

  async save(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, active: true },
      select: { id: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.savedItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) throw new ConflictException('Product already saved');

    await this.prisma.savedItem.create({ data: { userId, productId } });
    return { saved: true, productId };
  }

  async remove(userId: string, productId: string) {
    const item = await this.prisma.savedItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!item) throw new NotFoundException('Saved item not found');

    await this.prisma.savedItem.delete({
      where: { userId_productId: { userId, productId } },
    });

    return { saved: false, productId };
  }

  async isSaved(userId: string, productId: string) {
    const item = await this.prisma.savedItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { saved: Boolean(item), productId };
  }
}
