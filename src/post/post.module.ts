import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PostCleanupService } from './post.cleanup';

@Module({
  imports: [PrismaModule],
  providers: [PostService, PostCleanupService],
  controllers: [PostController],
  exports: [PrismaModule],
})
export class PostModule {} 
