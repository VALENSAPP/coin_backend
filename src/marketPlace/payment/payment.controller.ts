import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('create')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create marketplace payment checkout (85% owner / 15% platform)' })
    async create(@Req() req: Request, @Body() dto: CreatePaymentDto) {
        const payerUserId = (req.user as any)?.userId;
        return this.paymentService.createPayment(payerUserId, dto);
    }

    @Post('webhook')
    @HttpCode(200)
    @ApiOperation({ summary: 'Stripe webhook for marketplace payments' })
    async webhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
        const event = this.paymentService.constructWebhookEvent((req as any).body, signature);
        await this.paymentService.handleStripeEvent(event);
        return { received: true };
    }

    @Get(':paymentId')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'paymentId', description: 'Marketplace payment id' })
    @ApiOperation({ summary: 'Get marketplace payment by id' })
    async findOne(@Param('paymentId') paymentId: string) {
        return this.paymentService.getPaymentById(paymentId);
    }
}
