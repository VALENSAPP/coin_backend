import { Module } from '@nestjs/common';
import { NotificationModule } from '../../notification/notification.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { SellerOrderController } from './seller-order.controller';
import { SellerOrderService } from './seller-order.service';

@Module({
    imports: [PrismaModule, NotificationModule],
    controllers: [OrderController, SellerOrderController],
    providers: [OrderService, SellerOrderService],
    exports: [OrderService, SellerOrderService],
})
export class OrderModule { }
