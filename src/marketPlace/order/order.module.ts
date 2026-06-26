import { Module } from '@nestjs/common';
import { NotificationModule } from '../../notification/notification.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
    imports: [PrismaModule, NotificationModule],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService],
})
export class OrderModule { }
