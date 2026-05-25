import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';
import type { AuthenticatedUser } from './auth-user.decorator';

type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
  isEnvAdmin?: boolean;
};

const ENV_ADMIN_USER: AuthenticatedUser = {
  id: 'ENV_ADMIN',
  email: '',
  name: 'Platform Admin',
  avatar: '🛡️',
  verified: true,
  premium: false,
  role: 'ADMIN',
  business: null,
};

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

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

    // Regular DB user — must hold the ADMIN role
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        verified: true,
        premium: true,
        role: true,
        business: {
          select: { id: true, name: true, type: true, description: true, location: true, phone: true, verified: true, premium: true },
        },
      },
    });

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    request.user = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.['cm_token'];
    if (cookieToken) return cookieToken;
    return null;
  }
}
