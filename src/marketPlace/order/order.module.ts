import { Module, forwardRef } from '@nestjs/common';
import { NotificationModule } from '../../notification/notification.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClosetChatModule } from '../closet-chat/closet-chat.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderController } from './order.controller';
import { OrderPayoutLifecycleService } from './order-payout-lifecycle.service';
import { OrderPayoutService } from './order-payout.service';
import { OrderService } from './order.service';
import { SellerOrderController } from './seller-order.controller';
import { SellerOrderService } from './seller-order.service';

@Module({
    imports: [
        PrismaModule,
        NotificationModule,
        ClosetChatModule,
        forwardRef(() => ShippingModule),
    ],
    controllers: [OrderController, SellerOrderController],
    providers: [OrderService, SellerOrderService, OrderPayoutService, OrderPayoutLifecycleService],
    exports: [OrderService, SellerOrderService, OrderPayoutService],
})
export class OrderModule { }
