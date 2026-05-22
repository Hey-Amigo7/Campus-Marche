import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export type AuthenticatedUserBusiness = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  location: string;
  phone: string | null;
  verified: boolean;
  premium: boolean;
} | null;

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  avatar: string;
  verified: boolean;
  premium: boolean;
  role?: string;
  business?: AuthenticatedUserBusiness;
};

export type AccountType = 'Student' | 'Teacher' | 'Local vendor';

export const AuthUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
  if (!request.user) {
    throw new UnauthorizedException('Missing authenticated user');
  }

  return request.user;
});
