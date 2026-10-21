import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../common/mail/mail.module';
import { ModerationService } from './moderation.service';
import { AdminModerationService } from './admin-moderation.service';
import { PolicyEngineService } from './policy-engine.service';
import { ReportsService } from './reports.service';
import { AccountStandingService } from './account-standing.service';
import { AdminModerationController } from './admin-moderation.controller';
import { ModerationController } from './moderation.controller';
import { ReportsController } from './reports.controller';
import { AccountStandingController } from './account-standing.controller';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule, MailModule],
  controllers: [
    AdminModerationController,
    ModerationController,
    ReportsController,
    AccountStandingController,
  ],
  providers: [
    ModerationService,
    AdminModerationService,
    PolicyEngineService,
    ReportsService,
    AccountStandingService,
  ],
  exports: [
    ModerationService,
    AdminModerationService,
    PolicyEngineService,
    ReportsService,
    AccountStandingService,
  ],
})
export class ModerationModule {}
