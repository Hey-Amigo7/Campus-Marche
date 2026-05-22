import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from './prisma.service';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async getForProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        author: true,
        createdAt: true,
      },
    });
  }

  async getForSeller(sellerId: string) {
    return this.prisma.review.findMany({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        rating: true,
        comment: true,
        author: true,
        createdAt: true,
        product: { select: { id: true, title: true } },
      },
    });
  }

  async create(productId: string, reviewerId: string, reviewerName: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, active: true },
      select: { id: true, sellerId: true },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId === reviewerId) {
      throw new BadRequestException('You cannot review your own product');
    }

    const hasOrder = await this.prisma.order.findFirst({
      where: {
        buyerId: reviewerId,
        productId,
        status: 'Completed',
      },
    });

    if (!hasOrder) {
      throw new BadRequestException('You can only review products you have purchased and completed');
    }

    const existing = await this.prisma.review.findFirst({
      where: { productId, userId: product.sellerId },
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this product');
    }

    return this.prisma.review.create({
      data: {
        productId,
        userId: product.sellerId,
        rating: dto.rating,
        comment: dto.comment ?? null,
        author: reviewerName,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        author: true,
        createdAt: true,
      },
    });
  }
}
