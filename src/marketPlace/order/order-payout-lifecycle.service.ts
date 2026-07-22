import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderPayoutService } from './order-payout.service';

@Injectable()
export class OrderPayoutLifecycleService {
    private readonly logger = new Logger(OrderPayoutLifecycleService.name);
    private isRunning = false;

    constructor(private readonly orderPayoutService: OrderPayoutService) { }

    /** Every minute: release seller payouts whose 48h protection window has expired. */
    @Cron('*/1 * * * *')
    async handleDuePayouts() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const stats = await this.orderPayoutService.processDuePayouts(50);
            if (stats.scanned > 0) {
                this.logger.log(
                    `Marketplace payout cron: scanned=${stats.scanned} released=${stats.released} failed=${stats.failed} skipped=${stats.skipped}`,
                );
            }
        } catch (error: any) {
            this.logger.error(`Marketplace payout cron failed: ${error?.message || error}`, error?.stack);
        } finally {
            this.isRunning = false;
        }
    }
}
