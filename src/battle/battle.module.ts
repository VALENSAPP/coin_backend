import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { BattleCleanupService } from './battle.cleanup';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [BattleController],
  providers: [BattleService, BattleCleanupService],
})
export class BattleModule {}
