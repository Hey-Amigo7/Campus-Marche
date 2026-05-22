import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { CreateReportDto } from './dto/report.dto';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async submit(reporterId: string, dto: CreateReportDto) {
    if (!dto.reportedUserId && !dto.productId) {
      throw new BadRequestException('Report must target a user or a product');
    }

    if (dto.reportedUserId && dto.reportedUserId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    if (dto.reportedUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId } });
      if (!user) throw new NotFoundException('Reported user not found');
    }

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException('Reported product not found');
    }

    return this.prisma.report.create({
      data: {
        reason: dto.reason,
        description: dto.description,
        reporterId,
        reportedUserId: dto.reportedUserId,
        productId: dto.productId,
      },
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
