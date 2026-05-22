import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from './auth-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    request.user = await this.authService.getUserFromToken(token);
    return true;
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    const cookieToken = (request.cookies as Record<string, string> | undefined)?.['cm_token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }
}
