import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from './auth/auth-user.decorator';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SavedItemsService } from './saved-items.service';

@ApiTags('saved-items')
@Controller('saved-items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavedItemsController {
  constructor(private savedItemsService: SavedItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved products for the current user' })
  getAll(@AuthUser() user: { id: string }) {
    return this.savedItemsService.getForUser(user.id);
  }

  @Get(':productId/status')
  @ApiOperation({ summary: 'Check if a product is saved' })
  getStatus(@Param('productId') productId: string, @AuthUser() user: { id: string }) {
    return this.savedItemsService.isSaved(user.id, productId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Save a product to wishlist' })
  save(@Param('productId') productId: string, @AuthUser() user: { id: string }) {
    return this.savedItemsService.save(user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove a product from wishlist' })
  remove(@Param('productId') productId: string, @AuthUser() user: { id: string }) {
    return this.savedItemsService.remove(user.id, productId);
  }
}
