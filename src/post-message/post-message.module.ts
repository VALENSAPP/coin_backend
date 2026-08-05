import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostMessageController } from './post-message.controller';
import { PostMessageService } from './post-message.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostMessageController],
  providers: [PostMessageService],
  exports: [PostMessageService],
})
export class PostMessageModule {}
