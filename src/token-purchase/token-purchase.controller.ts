import { Controller, Post, Get, Body, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenPurchaseService } from './token-purchase.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto } from './dto/purchase-tokens.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@ApiTags('token-purchase')
@Controller('token-purchase')
export class TokenPurchaseController {
  constructor(private readonly tokenPurchaseService: TokenPurchaseService) {}

  @Post('purchase')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Purchase tokens with USD payment',
    description: 'Creates a Stripe payment intent for token purchase. Rate: 1 USD = 100 tokens. Fees: 0.2% platform + 0.5% vendor = 0.7% total deduction.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intent created successfully',
    type: TokenPurchaseResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or user not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid JWT token'
  })
  async purchaseTokens(
    @Body() dto: PurchaseTokensDto,
    @Req() req: Request
  ): Promise<TokenPurchaseResponseDto> {
    const userId = (req.user as any).userId;
    return this.tokenPurchaseService.createTokenPurchase(userId, dto);
  }

  @Get('balance')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user token balance',
    description: 'Returns the current token balance for the authenticated user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        balance: { type: 'number', example: 1500.50 }
      }
    }
  })
  async getTokenBalance(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const balance = await this.tokenPurchaseService.getUserTokenBalance(userId);
    return { balance };
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get token purchase history',
    description: 'Returns the purchase history for the authenticated user'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Purchase history retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        purchases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              amount: { type: 'number' },
              platformFee: { type: 'number' },
              vendorFee: { type: 'number' },
              restAmount: { type: 'number' },
              tokensReceived: { type: 'number' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  async getPurchaseHistory(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const purchases = await this.tokenPurchaseService.getUserTokenPurchases(userId);
    return { purchases };
  }
}