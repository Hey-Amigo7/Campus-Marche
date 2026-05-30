import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import type { AuthenticatedUser } from './auth-user.decorator';

type JwtPayload = { sub: string; email: string; role?: string; isEnvAdmin?: boolean };

const ENV_ADMIN_USER: AuthenticatedUser = {
  id: 'ENV_ADMIN', email: '', name: 'Platform Admin', avatar: '🛡️',
  verified: true, premium: false, role: 'ADMIN', business: null,
};

/**
 * Allows through: ADMIN-role users, env-admin tokens, AND any regular user
 * who has canEditEvents = true in the database.
 */
@Injectable()
export class EventsAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : (request.cookies as Record<string, string> | undefined)?.['cm_token'] ?? null;

    if (!token) throw new UnauthorizedException('Missing authorization token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.isEnvAdmin === true) {
      request.user = { ...ENV_ADMIN_USER, email: payload.email };
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, avatar: true,
        verified: true, premium: true, role: true, canEditEvents: true,
        business: {
          select: { id: true, name: true, type: true, description: true, location: true, phone: true, verified: true, premium: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (user.role !== 'ADMIN' && !user.canEditEvents) {
      throw new ForbiddenException('Events editor or admin access required');
    }

    request.user = user;
    return true;
  }
}
