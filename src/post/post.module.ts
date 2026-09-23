import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PostCleanupService } from './post.cleanup';
import { NotificationModule } from '../notification/notification.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [PrismaModule, NotificationModule, ModerationModule],
  providers: [PostService, PostCleanupService],
  controllers: [PostController],
  exports: [PrismaModule],
})
export class PostModule {} 
