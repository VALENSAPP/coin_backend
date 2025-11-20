import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingWebhookController } from './billing.webhook.controller';
import { TokenPurchaseModule } from '../token-purchase/token-purchase.module';

@Module({
  imports: [PrismaModule, TokenPurchaseModule, ScheduleModule.forRoot()],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService],
})
export class BillingModule {}


