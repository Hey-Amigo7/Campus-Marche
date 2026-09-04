import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { AuthUser } from './auth/auth-user.decorator';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ApprovePayoutDto, RequestPayoutDto } from './dto/payout.dto';
import { PayoutService } from './payout.service';

@ApiTags('payouts')
@ApiBearerAuth()
@Controller('payouts')
export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Request a payout from available wallet balance' })
  request(@Body() dto: RequestPayoutDto, @AuthUser() user: { id: string }) {
    return this.payoutService.requestPayout(user.id, dto.amount, dto.payoutMethod, dto.momoPhone);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get payout history for the authenticated seller' })
  history(@AuthUser() user: { id: string }) {
    return this.payoutService.getSellerPayouts(user.id);
  }

  // ── Admin endpoints — AdminAuthGuard accepts both env-admin JWT and DB ADMIN role ──

  @UseGuards(AdminAuthGuard)
  @Get('admin/pending')
  @ApiOperation({ summary: '[Admin] List all payouts with full order context (optionally filtered by status)' })
  adminListPending(@Query('status') status?: string, @Query('skip') skip = 0, @Query('take') take = 50) {
    return this.payoutService.listPayouts(
      status ? (status as PayoutStatus) : undefined,
      +skip,
      +take,
    );
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/:id/approve')
  @ApiOperation({ summary: '[Admin] Approve a pending payout and initiate Paystack transfer immediately' })
  adminApprove(@Param('id') id: string, @Body() _dto: ApprovePayoutDto) {
    return this.payoutService.adminApprovePayout(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/:id/cancel')
  @ApiOperation({ summary: '[Admin] Cancel a PENDING or PROCESSING payout and restore seller balance' })
  adminCancel(@Param('id') id: string) {
    return this.payoutService.adminCancelPayout(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/:id/void')
  @ApiOperation({ summary: '[Admin] Void a stuck PROCESSING payout and restore seller balance (e.g. OTP-blocked transfers)' })
  adminVoid(@Param('id') id: string) {
    return this.payoutService.adminRefundPayout(id);
  }
}
