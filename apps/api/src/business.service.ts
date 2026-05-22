import { Injectable } from '@nestjs/common';
import { UpsertBusinessDto } from './dto/business.dto';
import { PrismaService } from './prisma.service';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  getForUser(userId: string) {
    return this.prisma.businessProfile.findUnique({ where: { userId } });
  }

  async upsertForUser(userId: string, data: UpsertBusinessDto) {
    return this.prisma.businessProfile.upsert({
      where: { userId },
      update: data,
      create: {
        ...data,
        userId,
      },
    });
  }
}
