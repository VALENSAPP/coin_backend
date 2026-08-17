import { Module } from '@nestjs/common';
import { NotificationModule } from '../../notification/notification.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClosetChatController } from './closet-chat.controller';
import { ClosetChatService } from './closet-chat.service';

@Module({
    imports: [PrismaModule, NotificationModule],
    controllers: [ClosetChatController],
    providers: [ClosetChatService],
    exports: [ClosetChatService],
})
export class ClosetChatModule { }
