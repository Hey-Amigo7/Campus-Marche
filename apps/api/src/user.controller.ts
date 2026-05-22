import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) {}

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
    const data: { name?: string; avatar?: string } = {};
    if (body.name) data.name = body.name.trim();
    if (body.avatar !== undefined) data.avatar = body.avatar.trim() || body.name?.charAt(0).toUpperCase() || '';
    await this.prisma.user.update({ where: { id: user.id }, data });
    return this.authService.getProfileDataForUser(user.id);
  }
}
