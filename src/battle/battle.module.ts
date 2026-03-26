import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [BattleController],
  providers: [BattleService],
})
export class BattleModule {}
