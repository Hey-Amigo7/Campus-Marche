import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  async getProfile(sellerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        avatar: true,
        verified: true,
        premium: true,
        createdAt: true,
        business: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            location: true,
            phone: true,
            verified: true,
            premium: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Seller not found');

    const [products, reviewAgg] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId, active: true },
        include: { seller: { select: { id: true, name: true, avatar: true, verified: true, premium: true } } },
        orderBy: [{ boosted: 'desc' }, { featured: 'desc' }, { postedAt: 'desc' }],
        take: 20,
      }),
      this.prisma.review.aggregate({
        where: { userId: sellerId },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const firstName = user.name.split(' ')[0]?.toLowerCase() || 'seller';

    const totalViews = products.reduce((sum, p) => sum + p.views, 0);

    return {
      id: user.id,
      name: user.name,
      handle: `@${firstName}`,
      avatar: user.avatar,
      verified: user.verified,
      premium: user.premium,
      rating: Math.round((reviewAgg._avg.rating ?? 0) * 10) / 10,
      reviews: reviewAgg._count.id,
      location: user.business?.location ?? 'HTU Campus',
      joined: user.createdAt.getFullYear().toString(),
      bio: user.business?.description ?? 'Campus Marche seller.',
      banner: user.business?.name ?? user.name,
      responseTime: '< 30 min',
      business: user.business,
      analytics: {
        viewsThisWeek: totalViews,
        productClicks: products.length,
        interestedBuyers: reviewAgg._count.id,
      },
      products: products.map((p) => ({
        ...p,
        tags: typeof p.tags === 'string' ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      })),
    };
  }
}
