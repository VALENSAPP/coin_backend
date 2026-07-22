import { Module, forwardRef } from '@nestjs/common';
import { NotificationModule } from '../../notification/notification.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrderModule } from '../order/order.module';
import { ShippingService } from './shipping.service';
import { ShippingWebhookController } from './shipping.webhook.controller';

@Module({
    imports: [PrismaModule, NotificationModule, forwardRef(() => OrderModule)],
    controllers: [ShippingWebhookController],
    providers: [ShippingService],
    exports: [ShippingService],
})
export class ShippingModule { }
