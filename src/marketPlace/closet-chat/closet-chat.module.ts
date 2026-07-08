import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClosetChatController } from './closet-chat.controller';
import { ClosetChatService } from './closet-chat.service';

@Module({
    imports: [PrismaModule],
    controllers: [ClosetChatController],
    providers: [ClosetChatService],
    exports: [ClosetChatService],
})
export class ClosetChatModule { }
