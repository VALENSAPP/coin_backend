import { Controller, Get, Post, Req, UseGuards, Body, BadRequestException, Query, Param } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IsString, IsNotEmpty, IsNumber, Min, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BuyHitDto } from './dto/buy-hit.dto';
import { BuyFanSubscriptionDto } from './dto/buy-fan-subscription.dto';
import { PayFollowingDto } from './dto/pay-following.dto';
import { AddDigitalBadgeDto } from './dto/add-digital-badge.dto';


export class RequestWithdrawalDto {
  @ApiProperty({
    description: 'Amount to withdraw in USD',
    example: 50.00,
    minimum: 10
  })
  @IsNumber()
  @Min(10)
  @IsNotEmpty()
  amount: number;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session for subscription (uses env vars)' })
  async createSubscription(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const session = await this.billingService.createCheckoutSession(userId);
    return { url: session.url };
  }

  @Post('cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancelSubscription(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const result = await this.billingService.cancelSubscriptionAtPeriodEnd(userId);
    return { message: 'Subscription will cancel at period end', result };
  }

  @Post('pay-following')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session for one-time following payment' })
  @ApiBody({ type: PayFollowingDto })
  async createOneTimePayment(@Req() req: Request, @Body() dto: PayFollowingDto) {
    const payerUserId = (req.user as any).userId;
    if (dto.contentUserId === payerUserId) {
      throw new BadRequestException('You cannot pay yourself');
    }
    const session = await this.billingService.createOneTimePaymentCheckoutSession(
      payerUserId,
      dto.contentUserId,
      dto.amount,
    );
    return { url: session.url };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription details' })
  async getMySubscription(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const details = await this.billingService.getSubscriptionDetails(userId);
    return { subscription: details };
  }

  @Get('get-latest-transactions')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest transactions for the user' })
  async getLatestTransactions(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const transactions = await this.billingService.getLatestTransactions(userId);
    return { transactions };
  }

  @Get('getfanSubscriptionStatus/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get fan subscription status for current user and given receiver (creator) id' })
  @ApiParam({ name: 'id', description: 'Receiver (creator) user id' })
  async getFanSubscriptionStatus(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as any).userId;
    return this.billingService.getFanSubscriptionStatus(userId, id);
  }

  // Valens: withdrawals/redemptions excluded. Revenue from software services (Stripe subscriptions) only.
  @Post('request-withdrawal')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Disabled] Request withdrawal' })
  async requestWithdrawal(@Req() req: Request, @Body() dto: RequestWithdrawalDto) {
    throw new BadRequestException(
      'Withdrawals are not available. Valens does not manage liquidity or withdrawals; revenue is from software services (e.g. subscriptions) via Stripe only.'
    );
  }

  @Get('withdrawal-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Disabled] Get withdrawal history' })
  async getWithdrawalHistory(@Req() req: Request) {
    return { withdrawals: [] };
  }

  @Post('create-onboarding-link')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Connect onboarding link (required to receive payments)' })
  async createOnboardingLink(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const result = await this.billingService.createAccountOnboardingLink(userId);
    return result;
  }

  @Get('onboarding-status')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe Connect onboarding status for current user' })
  async getOnboardingStatus(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.billingService.getOnboardingStatus(userId);
  }

  @Post('buy-hit')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session for buying hits' })
  @ApiBody({ type: BuyHitDto })
  async buyHit(@Req() req: Request, @Body() dto: BuyHitDto) {
    const userId = (req.user as any).userId;

    // Validate that the userId in the request matches the authenticated user
    if (dto.userId !== userId) {
      throw new BadRequestException('User ID mismatch');
    }

    const result = await this.billingService.buyHit(dto.amount, dto.hitCount, dto.userId);
    return { message: 'Checkout session created', ...result };
  }

  @Post('fans-page-subscription')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session for fans page subscription' })
  async fansPageSubscription(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const session = await this.billingService.createFansPageSubscriptionCheckoutSession(userId);
    return { url: session.url };
  }

  @Post('buy-fan-subscription')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session for buying fan subscription' })
  @ApiBody({ type: BuyFanSubscriptionDto })
  async buyFanSubscription(@Req() req: Request, @Body() dto: BuyFanSubscriptionDto) {
    const userId = (req.user as any).userId;

    // Validate that the fanUserId matches the authenticated user
    if (dto.fanUserId == userId) {
      throw new BadRequestException('wrong fan user id');
    }

    const result = await this.billingService.createOneTimePaymentCheckForFanSubscription(dto.amount, dto.buyUserId, dto.fanUserId);
    return { message: 'Checkout session created', ...result };
  }

  @Get('user-buy-fan-subscription-list')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of fans who bought subscription to the user' })
  async getUserBuyFanSubscriptionList(@Query('userId') userId: string) {
    const subscriptions = await this.billingService.getUserBuyFanSubscriptionList(userId);
    return { subscriptions };
  }

  @Get('fan-subscription-user-list')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of subscriptions bought by the fan user' })
  async fanSubscriptionUserList(@Query('userId') userId: string) {
    const subscriptions = await this.billingService.fanSubscriptionUserList(userId);
    return { subscriptions };
  }

  @Get('user-transaction-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user transaction history by type or all types combined' })
  async userTransactionHistory(@Query('userId') userId: string, @Query('transactionType') transactionType: string) {
    const transactions = await this.billingService.userTransactionHistory(userId, transactionType);
    return { transactions };
  }

  @Post('add-digital-badge')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a digital badge transaction (sender = current user from token)' })
  @ApiBody({ type: AddDigitalBadgeDto })
  async addDigitalBadge(@Req() req: Request, @Body() dto: AddDigitalBadgeDto) {
    const senderId = (req.user as any).userId;
    const result = await this.billingService.addDigitalBadge(senderId, dto);
    return { message: 'Digital badge added', data: result };
  }

  @Get('get-digital-badge')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total digital badge amount received by current user' })
  async getDigitalBadge(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.billingService.getDigitalBadge(userId);
  }
}