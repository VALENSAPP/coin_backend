import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoryCleanupService {
  private readonly logger = new Logger(StoryCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredStories() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.prisma.story.updateMany({
      where: {
        deletedAt: null,
        createdAt: { lt: cutoff },
      },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Purged ${result.count} expired stories`);
  }
}


