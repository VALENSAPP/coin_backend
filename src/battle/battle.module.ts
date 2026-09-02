import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { BattleCleanupService } from './battle.cleanup';
import { PolymarketPredictionProvider } from './prediction/polymarket-prediction.provider';
import { ManifoldPredictionProvider } from './prediction/manifold-prediction.provider';
import { ApiFootballPredictionProvider } from './prediction/api-football-prediction.provider';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [BattleController],
  providers: [
    BattleService,
    BattleCleanupService,
    PolymarketPredictionProvider,
    ManifoldPredictionProvider,
    ApiFootballPredictionProvider,
  ],
})
export class BattleModule {}
