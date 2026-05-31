import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + readiness check — returns 503 if database is unreachable' })
  async check() {
    const start  = Date.now();
    let dbOk     = false;
    let dbMs     = 0;
    let dbError: string | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    } finally {
      dbMs = Date.now() - start;
    }

    const body = {
      status:    dbOk ? 'ok' : 'degraded',
      uptime:    Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbOk ? 'ok' : 'error', latencyMs: dbMs, error: dbError },
      },
    };

    if (!dbOk) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return body;
  }
}
