import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Campus Marche API is running.';
  }

  async getStats() {
    const [users, products, orders] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.order.count(),
    ]);
    return { users, products, orders };
  }
}
