import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PostCleanupService } from './post.cleanup';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [PostService, PostCleanupService],
  controllers: [PostController],
  exports: [PrismaModule],
})
export class PostModule {} 
