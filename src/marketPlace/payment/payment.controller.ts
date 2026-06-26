import { Body, Controller, Post, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CreateMarketplacePaymentDto } from './dto/create-marketplace-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('create')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create Stripe Payment Intent for My Closet cart checkout' })
    async createPaymentIntent(
        @Req() req: Request,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateMarketplacePaymentDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.paymentService.createPaymentIntentForCart(userId, dto);
    }
}
