import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { IsEnum, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PaymentService } from './payment.service';

class ChargeMomoDto {
  @ApiProperty({ example: '0244123456' })
  @IsString()
  phone!: string;

  @ApiProperty({ enum: ['mtn', 'vod', 'tgo'] })
  @IsEnum(['mtn', 'vod', 'tgo'])
  provider!: 'mtn' | 'vod' | 'tgo';
}

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  handleWebhook(
    @Req() req: { rawBody?: Buffer },
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody ?? Buffer.alloc(0), signature);
  }

  @Post('orders/:orderId/initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize Paystack payment for an order' })
  initializeOrder(@Param('orderId') orderId: string, @AuthUser() user: { id: string }) {
    return this.paymentService.initializeOrderPayment(orderId, user.id);
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a Paystack transaction and fund escrow' })
  verify(@Param('reference') reference: string, @AuthUser() user: { id: string }) {
    return this.paymentService.verify(reference, user.id);
  }

  @Post('orders/:orderId/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm delivery and release escrow funds to seller' })
  release(@Param('orderId') orderId: string, @AuthUser() user: { id: string }) {
    return this.paymentService.releaseEscrow(orderId, user.id);
  }

  @Post('orders/:orderId/mobile-money')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay via MTN MoMo / Telecel Cash / AirtelTigo — sends USSD prompt to phone' })
  chargeMobileMoney(
    @Param('orderId') orderId: string,
    @Body() body: ChargeMomoDto,
    @AuthUser() user: { id: string },
  ) {
    return this.paymentService.chargeMobileMoney(orderId, user.id, body.phone, body.provider);
  }

  @Get('mobile-money/:reference/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Poll mobile money charge status' })
  checkMomoStatus(@Param('reference') reference: string, @AuthUser() user: { id: string }) {
    return this.paymentService.checkMomoStatus(reference, user.id);
  }
}
