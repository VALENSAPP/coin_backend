import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BattleService } from './battle.service';

@Injectable()
export class BattleCleanupService {
  constructor(private readonly battleService: BattleService) { }

  // Runs every minute to cancel expired head-to-head invites (not accepted in time)
  @Cron('*/1 * * * *')
  async cancelExpiredPendingInvites() {
    await this.battleService.cancelExpiredPendingInvites();
  }

  // Runs every minute to close battles whose endTime has passed
  @Cron('*/1 * * * *')
  async closeExpiredBattles() {
    // Notify when a battle has ~2 hours remaining.
    await this.battleService.notifyBattlesClosingSoon();
    await this.battleService.closeExpiredBattles();
  }

  // Runs every minute to resolve closed head-to-head battles
  @Cron('*/1 * * * *')
  async resolveClosedHeadToHeadBattles() {
    // console.log('Resolving closed head-to-head battles...');
    await this.battleService.resolveClosedHeadToHeadBattles();
  }

  // Runs every minute to resolve closed poll battles (majority wins, likes tie-break)
  @Cron('*/1 * * * *')
  async resolveClosedPollBattles() {
    // console.log('Resolving closed poll battles...');
    await this.battleService.resolveClosedPollBattles();
  }
}
