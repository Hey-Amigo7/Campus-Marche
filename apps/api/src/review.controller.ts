import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import type { AuthenticatedUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CreateReviewDto, ReviewService } from './review.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  getForProduct(@Param('productId') productId: string) {
    return this.reviewService.getForProduct(productId);
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get reviews for a seller' })
  getForSeller(@Param('sellerId') sellerId: string) {
    return this.reviewService.getForSeller(sellerId);
  }

  @Post('product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a review for a completed purchase' })
  create(
    @Param('productId') productId: string,
    @Body() body: CreateReviewDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.reviewService.create(productId, user.id, user.name, body);
  }
}
