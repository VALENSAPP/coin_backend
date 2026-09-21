import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ModerationService } from './moderation.service';
import { AdminModerationService } from './admin-moderation.service';
import { AdminModerationController } from './admin-moderation.controller';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule],
  controllers: [AdminModerationController],
  providers: [ModerationService, AdminModerationService],
  exports: [ModerationService, AdminModerationService],
})
export class ModerationModule {}
