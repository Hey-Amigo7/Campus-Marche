import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SubscriptionService } from './subscription.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

const FALLBACK_IMAGES: Record<string, string> = {
  electronics: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  textbooks: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80',
  clothing: 'https://images.unsplash.com/photo-1520975914172-2c8e0f7fb247?auto=format&fit=crop&w=900&q=80',
  furniture: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
  notes: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80',
  sports: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=900&q=80',
  stationery: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=900&q=80',
  services: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
  default: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
};

const SELLER_SELECT = {
  id: true,
  name: true,
  avatar: true,
  verified: true,
  premium: true,
  business: {
    select: { location: true },
  },
} as const;

type SellerWithBusiness = {
  id: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  premium: boolean;
  business?: { location: string | null } | null;
};

type ProductWithSeller = {
  seller: SellerWithBusiness;
  imageUrl: string | null;
  imageStyle: string;
  category: string | null;
  tags: string;
  [key: string]: unknown;
};

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  private normalizeTags(tags: string | null | undefined): string[] {
    if (!tags) return [];
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private withDefaults(product: ProductWithSeller) {
    const categoryKey = String(product.category ?? '').trim().toLowerCase();
    const { business: sellerBusiness, ...sellerBase } = product.seller;

    return {
      ...product,
      seller: {
        ...sellerBase,
        location: sellerBusiness?.location ?? null,
      },
      imageUrl: product.imageUrl || FALLBACK_IMAGES[categoryKey] || FALLBACK_IMAGES.default,
      imageStyle: product.imageStyle || `category-${categoryKey || 'default'}`,
      tags: this.normalizeTags(product.tags as string),
    };
  }

  async getAll(opts: { skip?: number; take?: number } = {}) {
    const take = Math.min(opts.take ?? 48, 100);
    const skip = opts.skip ?? 0;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { active: true },
        include: { seller: { select: SELLER_SELECT } },
        orderBy: [{ boosted: 'desc' }, { featured: 'desc' }, { postedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.product.count({ where: { active: true } }),
    ]);

    return {
      data: products.map((p) => this.withDefaults(p as ProductWithSeller)),
      total,
      skip,
      take,
    };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, active: true },
      include: {
        seller: { select: SELLER_SELECT },
        reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!product) return null;

    await this.prisma.product.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => null);

    return this.withDefaults(product as ProductWithSeller);
  }

  async create(sellerId: string, data: CreateProductDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId: sellerId } });
    if (!business) {
      throw new BadRequestException('Create a business profile before listing products or services');
    }

    const [sub, activeCount] = await Promise.all([
      this.subscriptionService.getSubscription(sellerId),
      this.prisma.product.count({ where: { sellerId, active: true } }),
    ]);

    if (!this.subscriptionService.canListMore(sub, activeCount)) {
      throw new ForbiddenException(
        `Your free plan allows up to ${sub.features.maxListings} active listings. Upgrade to Seller Pro for unlimited listings.`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags ?? ''),
        sellerId,
      },
      include: { seller: { select: SELLER_SELECT } },
    });

    return this.withDefaults(product as ProductWithSeller);
  }

  async update(id: string, sellerId: string, data: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.sellerId !== sellerId) throw new ForbiddenException('You can only update your own products');

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags.join(',') : data.tags,
      },
      include: { seller: { select: SELLER_SELECT } },
    });

    return this.withDefaults(updated as ProductWithSeller);
  }

  async delete(id: string, sellerId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.sellerId !== sellerId) throw new ForbiddenException('You can only delete your own products');

    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }

  async getByCategory(category: string, opts: { skip?: number; take?: number } = {}) {
    const take = Math.min(opts.take ?? 48, 100);
    const skip = opts.skip ?? 0;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { category: { equals: category, mode: 'insensitive' }, active: true },
        include: { seller: { select: SELLER_SELECT } },
        orderBy: [{ boosted: 'desc' }, { featured: 'desc' }, { postedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.product.count({ where: { category: { equals: category, mode: 'insensitive' }, active: true } }),
    ]);

    return {
      data: products.map((p) => this.withDefaults(p as ProductWithSeller)),
      total,
      skip,
      take,
    };
  }

  async search(query: string, opts: { skip?: number; take?: number } = {}) {
    const safeQuery = query.trim();
    if (!safeQuery) return this.getAll(opts);

    const take = Math.min(opts.take ?? 48, 100);
    const skip = opts.skip ?? 0;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { title: { contains: safeQuery, mode: 'insensitive' } },
            { description: { contains: safeQuery, mode: 'insensitive' } },
            { tags: { contains: safeQuery, mode: 'insensitive' } },
            { category: { contains: safeQuery, mode: 'insensitive' } },
          ],
        },
        include: { seller: { select: SELLER_SELECT } },
        orderBy: [{ boosted: 'desc' }, { featured: 'desc' }, { postedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.product.count({
        where: {
          active: true,
          OR: [
            { title: { contains: safeQuery, mode: 'insensitive' } },
            { description: { contains: safeQuery, mode: 'insensitive' } },
            { tags: { contains: safeQuery, mode: 'insensitive' } },
            { category: { contains: safeQuery, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      data: products.map((p) => this.withDefaults(p as ProductWithSeller)),
      total,
      skip,
      take,
    };
  }

  async getCategories() {
    const groups = await this.prisma.product.groupBy({
      by: ['category'],
      where: { active: true },
      _count: { id: true },
    });

    return groups
      .filter((g) => g.category)
      .map((g) => ({ name: g.category!, count: g._count.id }))
      .sort((a, b) => b.count - a.count);
  }
}
