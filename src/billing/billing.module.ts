import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingWebhookController } from './billing.webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService],
})
export class BillingModule {}


