import { BadRequestException, Body, Controller, Delete, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search users by name or email prefix' })
  async searchUsers(@AuthUser() user: { id: string }, @Query('q') q: string) {
    if (!q || q.trim().length < 2) return [];
    const term = q.trim();
    const results = await this.prisma.user.findMany({
      where: {
        id: { not: user.id },
        OR: [
          { name:  { contains: term, mode: 'insensitive' } },
          { email: { startsWith: term.toLowerCase() } },
        ],
      },
      select: { id: true, name: true, avatar: true, verified: true },
      take: 10,
      orderBy: { name: 'asc' },
    });
    return results;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get profile for authenticated user' })
  async getProfile(@AuthUser() user: { id: string }) {
    return this.authService.getProfileDataForUser(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update name and avatar' })
  async updateProfile(@AuthUser() user: { id: string }, @Body() body: UpdateProfileDto) {
    const data: { name?: string; avatar?: string; bio?: string } = {};
    if (body.name) data.name = body.name.trim();
    if (body.avatar !== undefined) data.avatar = body.avatar.trim() || body.name?.charAt(0).toUpperCase() || '';
    if (body.bio !== undefined) data.bio = body.bio.trim();
    await this.prisma.user.update({ where: { id: user.id }, data });
    return this.authService.getProfileDataForUser(user.id);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Permanently delete (anonymize) the authenticated user account' })
  async deleteAccount(@AuthUser() user: { id: string }) {
    const pendingOrders = await this.prisma.order.count({
      where: {
        buyerId: user.id,
        status: { notIn: ['Completed', 'Cancelled'] },
      },
    });

    if (pendingOrders > 0) {
      throw new BadRequestException(
        `You have ${pendingOrders} pending order${pendingOrders > 1 ? 's' : ''}. Please wait for them to complete or cancel before deleting your account.`,
      );
    }

    const ghostEmail = `deleted_${user.id}_${Date.now()}@campusmarche.invalid`;
    const ghostPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    await this.prisma.$transaction([
      // Anonymize personal data
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: 'Deleted User',
          email: ghostEmail,
          password: ghostPassword,
          avatar: '?',
          phone: null,
          phoneVerified: false,
          verified: false,
          premium: false,
        },
      }),
      // Deactivate all listings
      this.prisma.product.updateMany({
        where: { sellerId: user.id, active: true },
        data: { active: false },
      }),
      // Wipe private records
      this.prisma.savedItem.deleteMany({ where: { userId: user.id } }),
      this.prisma.notification.deleteMany({ where: { userId: user.id } }),
      this.prisma.otpVerification.deleteMany({ where: { userId: user.id } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      this.prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
    ]);

    return { message: 'Account deleted. Your personal data has been removed.' };
  }
}
