import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { WithdrawalPagesController } from './withdrawal-pages.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenPurchaseModule } from '../token-purchase/token-purchase.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, TokenPurchaseModule, NotificationModule],
  controllers: [BillingController, BillingWebhookController, WithdrawalPagesController],
  providers: [BillingService],
})
export class BillingModule { }


