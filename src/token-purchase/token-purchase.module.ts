import { Module, forwardRef } from '@nestjs/common';
import { TokenPurchaseService } from './token-purchase.service';
import { TokenPurchaseController } from './token-purchase.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenModule } from '../token/token.module';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { WalletModule } from '../wallet/wallet.module';
import { PagBankModule } from '../pagbank/pagbank.module';
import { PaymentModule } from '../marketPlace/payment/payment.module';
import { CurrencyModule } from '../common/currency/currency.module';

@Module({
  imports: [
    PrismaModule,
    TokenModule,
    UserModule,
    NotificationModule,
    WalletModule,
    forwardRef(() => PagBankModule),
    PaymentModule,
    CurrencyModule,
  ],
  controllers: [TokenPurchaseController],
  providers: [TokenPurchaseService],
  exports: [TokenPurchaseService],
})
export class TokenPurchaseModule {}