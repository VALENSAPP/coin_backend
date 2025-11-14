import { Controller, Get, Post, Req, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IsString, IsNotEmpty, IsNumber, Min, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BuyHitDto } from './dto/buy-hit.dto';

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

  @ApiProperty({
    description: 'Bank account details for withdrawal',
    example: {
      accountNumber: '1234567890',
      routingNumber: '021000021',
      accountHolderName: 'John Doe',
      bankName: 'Bank of America'
    }
  })
  @IsObject()
  @IsNotEmpty()
  bankDetails: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    bankName: string;
  };
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Payment amount in USD',
          example: 10.00,
        },
      },
      required: ['amount'],
    },
  })
  async createOneTimePayment(@Req() req: Request, @Body() body: { amount: number }) {
    const userId = (req.user as any).userId;
    const { amount } = body;
    if (!amount || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    const session = await this.billingService.createOneTimePaymentCheckoutSession(userId, amount);
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

  @Post('request-withdrawal')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request withdrawal to bank account' })
  @ApiBody({ type: RequestWithdrawalDto })
  async requestWithdrawal(@Req() req: Request, @Body() dto: RequestWithdrawalDto) {
    const userId = (req.user as any).userId;
    const result = await this.billingService.requestWithdrawal(userId, dto.amount, dto.bankDetails);
    return result;
  }

  @Get('withdrawal-history')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user withdrawal history' })
  async getWithdrawalHistory(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const history = await this.billingService.getWithdrawalHistory(userId);
    return { withdrawals: history };
  }

  @Post('create-onboarding-link')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Connect onboarding link for withdrawals' })
  async createOnboardingLink(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const result = await this.billingService.createAccountOnboardingLink(userId);
    return result;
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
}


