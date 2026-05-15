import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { PrivateCircleController } from './private-circle.controller';
import { PrivateCircleService } from './private-circle.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [PrivateCircleController],
  providers: [PrivateCircleService],
  exports: [PrivateCircleService],
})
export class PrivateCircleModule {}
