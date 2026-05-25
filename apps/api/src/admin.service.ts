import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private log(adminId: string, action: string, entity: string, entityId: string, details?: string) {
    // Env-based admin has no DB user record — skip the FK-bound log entry
    if (adminId === 'ENV_ADMIN') return Promise.resolve(null);
    return this.prisma.adminLog.create({
      data: { adminId, action, entity, entityId, details },
    });
  }

  async adminLogin(email: string, password: string) {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL', 'admin@campus-marche.com');
    const adminPassword = this.config.get<string>('ADMIN_PASSWORD', 'Admin@123!');

    if (email.trim().toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: 'ENV_ADMIN',
      email: adminEmail,
      role: 'ADMIN',
      isEnvAdmin: true,
    });

    return { token, admin: { email: adminEmail, role: 'ADMIN' } };
  }

  // Legacy method kept for backward compatibility
  async getStats() {
    return this.getDashboardStats();
  }

  async getDashboardStats() {
    const [users, products, orders, reports, revenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.order.count(),
      this.prisma.report.count({ where: { status: 'pending' } }),
      this.prisma.paymentTransaction.aggregate({
        where: { status: 'Paid' },
        _sum: { amount: true },
      }),
    ]);
    return { users, products, orders, pendingReports: reports, revenue: revenue._sum.amount ?? 0 };
  }

  async getUsers(skip = 0, take = 50, q?: string) {
    take = Math.min(take, 50);

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          premium: true,
          canEditEvents: true,
          createdAt: true,
          business: { select: { name: true, premium: true } },
          _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  async setUserRole(adminId: string, targetUserId: string, role: string) {
    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: role as 'USER' | 'MODERATOR' | 'ADMIN' },
      select: { id: true, email: true, role: true },
    });

    await this.log(adminId, 'SET_ROLE', 'User', targetUserId, `role -> ${role}`);
    return updated;
  }

  async suspendUser(userId: string, adminId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { verified: false },
    });
    await this.log(adminId, 'suspend_user', 'user', userId);
    return user;
  }

  async getProducts(skip = 0, take = 50, q?: string) {
    const where: Record<string, unknown> = {};
    if (q) where['OR'] = [{ title: { contains: q, mode: 'insensitive' } }];
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { seller: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  async toggleProductActive(productId: string, adminId: string, active: boolean) {
    const product = await this.prisma.product.update({ where: { id: productId }, data: { active } });
    await this.log(adminId, active ? 'activate_product' : 'deactivate_product', 'product', productId);
    return product;
  }

  // Legacy method kept for backward compatibility
  async deactivateProduct(adminId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { active: false },
      select: { id: true, title: true, active: true },
    });

    await this.log(adminId, 'DEACTIVATE_PRODUCT', 'Product', productId);
    return updated;
  }

  async getReports(statusOrSkip?: string | number, pageOrTake = 1, limit = 20) {
    // Handle both old signature getReports(status?, page?) and new getReports(skip, take)
    if (typeof statusOrSkip === 'number') {
      const skip = statusOrSkip;
      const take = pageOrTake;
      const [reports, total] = await Promise.all([
        this.prisma.report.findMany({
          include: {
            reporter: { select: { id: true, name: true } },
            reportedUser: { select: { id: true, name: true } },
            product: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.report.count(),
      ]);
      return { reports, total };
    }

    // Legacy: statusOrSkip is a status string or undefined
    const status = statusOrSkip;
    const page = pageOrTake;
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          reportedUser: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, title: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async resolveReport(adminIdOrReportId: string, reportIdOrAdminId: string, status: string) {
    // Support both old signature resolveReport(adminId, reportId, status)
    // and new signature resolveReport(reportId, adminId, status)
    // We can't distinguish them reliably — keep old signature for legacy controller
    const adminId = adminIdOrReportId;
    const reportId = reportIdOrAdminId;

    if (!['resolved', 'dismissed', 'actioned', 'pending'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    await this.log(adminId, 'RESOLVE_REPORT', 'Report', reportId, `status -> ${status}`);
    return updated;
  }

  async getLogs(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.adminLog.count(),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
  }

  async getEvents(skip = 0, take = 50) {
    return this.prisma.campusEvent.findMany({ orderBy: { eventDate: 'desc' }, skip, take });
  }

  async createEvent(data: {
    title: string;
    description: string;
    location: string;
    eventDate: Date;
    category: string;
    opportunity?: string;
    imageUrl?: string;
  }) {
    return this.prisma.campusEvent.create({ data });
  }

  async updateEvent(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      location: string;
      eventDate: Date;
      category: string;
      opportunity: string;
      imageUrl: string;
      featured: boolean;
    }>,
  ) {
    return this.prisma.campusEvent.update({ where: { id }, data });
  }

  async deleteEvent(id: string) {
    return this.prisma.campusEvent.delete({ where: { id } });
  }

  async grantEventsPermission(adminId: string, userId: string, canEdit: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { canEditEvents: canEdit },
      select: { id: true, email: true, canEditEvents: true },
    });

    await this.log(adminId, canEdit ? 'GRANT_EVENTS' : 'REVOKE_EVENTS', 'User', userId);
    return updated;
  }

  async getLocations() {
    const [productLocations, businessLocations] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['location'],
        where: { active: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.businessProfile.groupBy({
        by: ['location'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const merged = new Map<string, number>();
    for (const p of productLocations) {
      if (p.location?.trim()) merged.set(p.location.trim(), (merged.get(p.location.trim()) ?? 0) + p._count.id);
    }
    for (const b of businessLocations) {
      if (b.location?.trim()) merged.set(b.location.trim(), (merged.get(b.location.trim()) ?? 0) + b._count.id);
    }

    return Array.from(merged.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([location, count]) => ({ location, count }));
  }
}
