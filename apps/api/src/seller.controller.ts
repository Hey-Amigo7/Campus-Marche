import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SellerService } from './seller.service';

@ApiTags('sellers')
@Controller('sellers')
export class SellerController {
  constructor(private sellerService: SellerService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get seller profile with their active products and rating' })
  getProfile(@Param('id') id: string) {
    return this.sellerService.getProfile(id);
  }
}
