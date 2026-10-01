import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { MeritIncentivesService } from './providers/merit.service';
import { PointsComService } from './providers/points-com.service';
import { ExpediaService } from './providers/expedia.service';

@Module({
  imports: [PrismaModule],
  controllers: [RewardsController],
  providers: [
    RewardsService,
    MeritIncentivesService,
    PointsComService,
    ExpediaService,
  ],
  exports: [
    RewardsService,
    MeritIncentivesService,
    PointsComService,
    ExpediaService,
  ],
})
export class RewardsModule {}
