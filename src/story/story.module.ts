import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StoryService } from './story.service';
import { StoryController } from './story.controller';
import { StoryCleanupService } from './story.cleanup';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [StoryController],
  providers: [StoryService, StoryCleanupService],
})
export class StoryModule {}


