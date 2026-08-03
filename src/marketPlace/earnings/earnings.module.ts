import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../../wallet/wallet.module';
import { EarningsController } from './earnings.controller';
import { EarningsService } from './earnings.service';

@Module({
    imports: [PrismaModule, WalletModule],
    controllers: [EarningsController],
    providers: [EarningsService],
    exports: [EarningsService],
})
export class EarningsModule { }
