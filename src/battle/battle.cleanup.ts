import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BattleService } from './battle.service';

@Injectable()
export class BattleCleanupService {
  constructor(private readonly battleService: BattleService) {}

  // Runs every minute to close battles whose endTime has passed
  @Cron('*/1 * * * *')
  async closeExpiredBattles() {
    await this.battleService.closeExpiredBattles();
  }
}
