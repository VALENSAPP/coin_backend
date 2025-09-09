import { Controller, Get, Post, Req, UseGuards, Body, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

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
}


