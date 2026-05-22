import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BusinessService } from './business.service';
import { UpsertBusinessDto } from './dto/business.dto';

@ApiTags('business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user business profile' })
  getMine(@AuthUser() user: { id: string }) {
    return this.businessService.getForUser(user.id);
  }

  @Post('me')
  @ApiOperation({ summary: 'Create or update the authenticated user business profile' })
  upsertMine(@AuthUser() user: { id: string }, @Body() body: UpsertBusinessDto) {
    return this.businessService.upsertForUser(user.id, body);
  }
}
