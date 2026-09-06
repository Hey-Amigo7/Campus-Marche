import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  getUpcoming() {
    return this.prisma.campusEvent.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { eventDate: 'asc' },
    });
  }
}
