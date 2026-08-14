import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../notification/notification.module';
import { PagBankModule } from '../../pagbank/pagbank.module';
import { PaymentModule } from '../payment/payment.module';
import { MarketplaceBattleBoostController } from './marketplace-battle-boost.controller';
import { MarketplaceBattleBoostLifecycleService } from './marketplace-battle-boost-lifecycle.service';
import { MarketplaceBattleBoostService } from './marketplace-battle-boost.service';
import { MarketplaceBattleLifecycleService } from './marketplace-battle-lifecycle.service';
import { MarketplaceBattlesPublicController } from './marketplace-battles-public.controller';
import { MarketplaceBattlesController } from './marketplace-battles.controller';
import { MarketplaceBattlesService } from './marketplace-battles.service';

@Module({
    imports: [
        PrismaModule,
        NotificationModule,
        PaymentModule,
        forwardRef(() => PagBankModule),
    ],
    controllers: [
        MarketplaceBattlesPublicController,
        MarketplaceBattlesController,
        MarketplaceBattleBoostController,
    ],
    providers: [
        MarketplaceBattlesService,
        MarketplaceBattleLifecycleService,
        MarketplaceBattleBoostService,
        MarketplaceBattleBoostLifecycleService,
    ],
    exports: [MarketplaceBattlesService, MarketplaceBattleBoostService],
})
export class MarketplaceBattlesModule { }
