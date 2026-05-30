import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  imageUrls: string[];
  imageStyle: string;
  category: string | null;
  tags: string;
  [key: string]: unknown;
};

type UnsplashSearchResponse = {
  results: Array<{ urls: { regular: string; small: string } }>;
};

@Injectable()
export class ProductService implements OnModuleInit {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    // Run after the module boots so the DB connection is ready
    setImmediate(() => this.runImageBackfill());
  }

  private async runImageBackfill(): Promise<void> {
    const key = this.config.get<string>('UNSPLASH_ACCESS_KEY');
    if (!key) return;

    const missing = await this.prisma.product.findMany({
      where: { imageUrl: null, active: true },
      select: { id: true, title: true, category: true },
      orderBy: { postedAt: 'desc' },
    });

    if (missing.length === 0) return;
    this.logger.log(`[Backfill] Fetching Unsplash images for ${missing.length} listing(s)…`);

    let updated = 0;
    for (const p of missing) {
      const url = await this.fetchRelevantImage(p.title, p.category ?? '');
      if (url) {
        await this.prisma.product.update({ where: { id: p.id }, data: { imageUrl: url } }).catch(() => null);
        updated++;
      }
    }
    this.logger.log(`[Backfill] Done — ${updated}/${missing.length} listing(s) updated.`);
  }

  /**
   * Searches Unsplash for an image that matches the product title and category.
   * Returns the CDN URL (stored permanently in the DB) or null if unavailable.
   */
  private static readonly STOP_WORDS = new Set([
    'for', 'sale', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'a', 'an',
    'is', 'it', 'its', 'of', 'with', 'from', 'by', 'my', 'our', 'your',
    'good', 'bad', 'excellent', 'perfect', 'great', 'nice', 'best', 'top',
    'used', 'new', 'old', 'brand', 'quality', 'cheap', 'affordable', 'price',
    'condition', 'available', 'call', 'contact', 'offer', 'price', 'reduced',
  ]);

  private async fetchRelevantImage(title: string, category: string): Promise<string | null> {
    const key = this.config.get<string>('UNSPLASH_ACCESS_KEY');
    if (!key) return null;

    // Extract meaningful keywords — drop stop words and very short tokens
    const titleWords = title
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !ProductService.STOP_WORDS.has(w.toLowerCase()))
      .slice(0, 4)
      .join(' ');

    // Use title keywords as primary signal; fall back to category alone if title is generic
    const searchQuery = titleWords.length > 2 ? titleWords : category;
    const query = encodeURIComponent(searchQuery.trim());

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=3&orientation=landscape&content_filter=high`,
        {
          headers: { Authorization: `Client-ID ${key}` },
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);

      if (!res.ok) {
        this.logger.warn(`Unsplash search failed (${res.status}) for: ${titleWords}`);
        return null;
      }

      const data = (await res.json()) as UnsplashSearchResponse;
      // Pick the best result — prefer first which Unsplash ranks most relevant
      const url = data.results[0]?.urls.regular ?? null;
      if (url) this.logger.log(`Unsplash image resolved for "${titleWords}"`);
      return url;
    } catch (err) {
      if ((err as { name?: string }).name !== 'AbortError') {
        this.logger.warn(`Unsplash fetch error: ${String(err)}`);
      }
      return null;
    }
  }

  /** Fire-and-forget: fetch + persist a relevant Unsplash image for a listing that has none. */
  private backfillProductImage(id: string, title: string, category: string): void {
    this.fetchRelevantImage(title, category)
      .then((url) => {
        if (url) {
          return this.prisma.product.update({ where: { id }, data: { imageUrl: url } });
        }
      })
      .catch(() => null);
  }

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

    // Backfill images for listings missing one — max 4 per request, fire-and-forget
    products
      .filter((p) => !p.imageUrl)
      .slice(0, 4)
      .forEach((p) => this.backfillProductImage(p.id, p.title, p.category ?? ''));

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

    // Backfill image if missing
    if (!product.imageUrl) {
      this.backfillProductImage(product.id, product.title, product.category ?? '');
    }

    return this.withDefaults(product as ProductWithSeller);
  }

  /**
   * Record a unique view for a product. Uses the viewerKey (userId or anonymous
   * session ID) to deduplicate — a second call with the same key is a no-op and
   * does NOT increment the counter.
   */
  async recordView(productId: string, viewerKey: string): Promise<void> {
    try {
      const created = await this.prisma.productView.create({
        data: { productId, viewerKey },
      });
      // Only increment the counter when a new unique view was recorded
      if (created) {
        await this.prisma.product.update({
          where: { id: productId },
          data: { views: { increment: 1 } },
        }).catch(() => null);
      }
    } catch {
      // Unique constraint violation = already viewed — do nothing
    }
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

    // Primary image: first of imageUrls array, then imageUrl, then Unsplash fallback
    const { imageUrls, ...restData } = data;
    const primaryFromArray = imageUrls?.[0];
    const resolvedPrimary =
      primaryFromArray ?? data.imageUrl ?? (await this.fetchRelevantImage(data.title, data.category ?? ''));

    const product = await this.prisma.product.create({
      data: {
        ...restData,
        imageUrl: resolvedPrimary ?? undefined,
        imageUrls: imageUrls ?? [],
        tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags ?? ''),
        sellerId,
      },
      include: { seller: { select: SELLER_SELECT } },
    });

    return this.withDefaults(product as ProductWithSeller);
  }

  async update(id: string, sellerId: string, data: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, imageUrl: true, title: true, category: true },
    });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.sellerId !== sellerId) throw new ForbiddenException('You can only update your own products');

    const { imageUrls, ...restUpdateData } = data;
    const primaryFromArray = imageUrls?.[0];

    // Fetch a smart image only if the listing currently has no real image and none was provided
    let resolvedImageUrl = primaryFromArray ?? data.imageUrl;
    if (!resolvedImageUrl && !existing.imageUrl) {
      const title = data.title ?? existing.title;
      const category = data.category ?? existing.category ?? '';
      resolvedImageUrl = (await this.fetchRelevantImage(title, category)) ?? undefined;
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...restUpdateData,
        ...(resolvedImageUrl !== undefined && { imageUrl: resolvedImageUrl }),
        ...(imageUrls !== undefined && { imageUrls }),
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

  async getBySellerFull(sellerId: string) {
    const products = await this.prisma.product.findMany({
      where: { sellerId },
      include: { seller: { select: SELLER_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.withDefaults(p as ProductWithSeller));
  }

  async markSold(id: string, sellerId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.sellerId !== sellerId) throw new ForbiddenException('You can only modify your own products');
    return this.prisma.product.update({ where: { id }, data: { active: false, soldAt: new Date() } });
  }

  async archive(id: string, sellerId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.sellerId !== sellerId) throw new ForbiddenException('You can only modify your own products');
    return this.prisma.product.update({ where: { id }, data: { active: false } });
  }

  async restore(id: string, sellerId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.sellerId !== sellerId) throw new ForbiddenException('You can only modify your own products');
    return this.prisma.product.update({ where: { id }, data: { active: true, soldAt: null } });
  }
}
