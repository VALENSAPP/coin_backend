import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderModule } from '../marketPlace/order/order.module';
import { MarketplaceBattlesModule } from '../marketPlace/marketplace-battles/marketplace-battles.module';
import { PagBankClient } from './pagbank.client';
import { PagBankService } from './pagbank.service';
import { PagBankWebhookController } from './pagbank.webhook.controller';

@Module({
    imports: [
        PrismaModule,
        WalletModule,
        NotificationModule,
        forwardRef(() => OrderModule),
        forwardRef(() => MarketplaceBattlesModule),
    ],
    controllers: [PagBankWebhookController],
    providers: [PagBankClient, PagBankService],
    exports: [PagBankService, PagBankClient],
})
export class PagBankModule { }
