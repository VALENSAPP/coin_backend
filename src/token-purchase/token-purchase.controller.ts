import { Controller, Post, Get, Body, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TokenPurchaseService } from './token-purchase.service';
import { PurchaseTokensDto, TokenPurchaseResponseDto, BuyTokenDto, GetTokenPriceDto } from './dto/purchase-tokens.dto';
import { TokenService } from '../token/token.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@ApiTags('token-purchase')
@Controller('token-purchase')
export class TokenPurchaseController {
  constructor(
    private readonly tokenPurchaseService: TokenPurchaseService,
    private readonly tokenService: TokenService
  ) {}

  @Post('purchase')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Purchase tokens with USD payment',
    description: 'Creates a Stripe checkout session for token purchase. Rate: 1 USD = 100 tokens. All fee parameters (platformFee, vendorFee, restAmount, tokensReceived) are provided by the frontend. Returns session URL for payment redirect.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Checkout session created successfully',
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

  @Post('buy-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buy tokens using blockchain smart contract',
    description: 'Calls the buyFor method on the smart contract to purchase tokens. Requires userId (whose token to buy) and userPaid amount.'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Token purchase successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        transactionHash: { type: 'string', example: '0x123...' },
        tokenAddress: { type: 'string', example: '0x456...' },
        buyerAddress: { type: 'string', example: '0x789...' },
        usdPaid: { type: 'number', example: 10.00 },
        blockNumber: { type: 'number', example: 123456 }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request or user/token not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid JWT token'
  })
  async buyToken(
    @Body() dto: BuyTokenDto,
    @Req() req: Request
  ) {
    const buyerUserId = (req.user as any).userId;
    return this.tokenPurchaseService.buyToken(buyerUserId, dto);
  }

  @Post('get-token-price')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get token price in USD',
    description: 'Calls the smart contract to get the current price per token in USD for a given token address'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token price retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tokenAddress: { type: 'string', example: '0x123...' },
        priceInUsd: { type: 'number', example: 0.0001 },
        priceInWei: { type: 'string', example: '100000000000000' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid token address or contract error'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid JWT token'
  })
  async getTokenPrice(@Body() dto: GetTokenPriceDto) {
    return this.tokenService.getPricePerTokenUsd(dto.tokenAddress);
  }
}