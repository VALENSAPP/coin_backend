import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { WithdrawalPagesController } from './withdrawal-pages.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenPurchaseModule } from '../token-purchase/token-purchase.module';
import { NotificationModule } from '../notification/notification.module';
import { MarketplaceBattlesModule } from '../marketPlace/marketplace-battles/marketplace-battles.module';
import { PaymentModule } from '../marketPlace/payment/payment.module';
import { WalletModule } from '../wallet/wallet.module';
import { PagBankModule } from '../pagbank/pagbank.module';

@Module({
  imports: [
    PrismaModule,
    TokenPurchaseModule,
    NotificationModule,
    PaymentModule,
    MarketplaceBattlesModule,
    WalletModule,
    PagBankModule,
  ],
  controllers: [BillingController, BillingWebhookController, WithdrawalPagesController],
  providers: [BillingService],
})
export class BillingModule { }


