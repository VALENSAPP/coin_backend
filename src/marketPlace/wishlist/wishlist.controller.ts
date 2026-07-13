import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    @Post('items')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add item to wishlist' })
    async addItem(
        @Req() req: Request,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AddWishlistItemDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.wishlistService.addItem(userId, dto);
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get authenticated user wishlist' })
    async getWishlist(@Req() req: Request, @Query('sellerId') sellerId?: string) {
        const userId = (req.user as any)?.userId;
        return this.wishlistService.getWishlist(userId, sellerId);
    }

    @Delete('items/:wishlistItemId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'wishlistItemId', type: 'string' })
    @ApiOperation({ summary: 'Remove item from wishlist' })
    async removeItem(@Req() req: Request, @Param('wishlistItemId') wishlistItemId: string) {
        const userId = (req.user as any)?.userId;
        return this.wishlistService.removeItem(userId, wishlistItemId);
    }

    @Delete()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete authenticated user wishlist' })
    async deleteWishlist(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.wishlistService.deleteWishlist(userId);
    }
}
