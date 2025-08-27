import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Request } from 'express';

class CreateSubscriptionDto {
  @ApiProperty({ description: 'Stripe Price ID for the plan' })
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @ApiProperty({ description: 'Success URL for Stripe checkout' })
  @IsString()
  @IsNotEmpty()
  successUrl: string;

  @ApiProperty({ description: 'Cancel URL for Stripe checkout' })
  @IsString()
  @IsNotEmpty()
  cancelUrl: string;

  @ApiProperty({ required: false, description: 'Quantity (defaults to 1)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout Session for subscription' })
  async createSubscription(@Req() req: Request, @Body() dto: CreateSubscriptionDto) {
    const userId = (req.user as any).userId;
    const session = await this.billingService.createCheckoutSession(userId, dto);
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


