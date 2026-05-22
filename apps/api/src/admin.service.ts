import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private log(adminId: string, action: string, entity: string, entityId: string, details?: string) {
    return this.prisma.adminLog.create({
      data: { adminId, action, entity, entityId, details },
    });
  }

  async getStats() {
    const [users, products, orders, reports, pendingReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.order.count(),
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'pending' } }),
    ]);

    return { users, products, orders, reports, pendingReports };
  }

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          verified: true,
          premium: true,
          createdAt: true,
          _count: { select: { products: true, orders: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    return { data, total, page, pages: Math.ceil(total / limit) };
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

  async getReports(status?: string, page = 1, limit = 20) {
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

  async resolveReport(adminId: string, reportId: string, status: string) {
    if (!['resolved', 'dismissed'].includes(status)) {
      throw new BadRequestException('Status must be "resolved" or "dismissed"');
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
}
