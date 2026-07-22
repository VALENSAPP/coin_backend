import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ShippingService } from './shipping.service';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingWebhookController {
    constructor(private readonly shippingService: ShippingService) { }

    @Post('easypost/webhook')
    @ApiExcludeEndpoint()
    async handleEasyPostWebhook(
        @Req() req: Request,
        @Headers('x-hmac-signature') hmacSignature?: string,
    ) {
        const rawBody = Buffer.isBuffer(req.body)
            ? req.body
            : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

        return this.shippingService.handleEasyPostWebhook(rawBody, hmacSignature);
    }
}
