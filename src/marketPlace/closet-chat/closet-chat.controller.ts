import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ClosetChatService } from './closet-chat.service';
import { GetClosetChatMessagesDto } from './dto/get-closet-chat-messages.dto';
import { SendClosetChatMessageDto } from './dto/send-closet-chat-message.dto';

@ApiTags('closet-chat')
@Controller('closet-chat')
export class ClosetChatController {
    constructor(private readonly closetChatService: ClosetChatService) { }

    @Get('threads')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get closet chat threads for authenticated buyer/seller' })
    async getMyThreads(@Req() req: Request) {
        const userId = (req.user as any)?.userId;
        return this.closetChatService.getMyThreads(userId);
    }

    @Get('threads/:threadId/messages')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'threadId', description: 'Closet chat thread id' })
    @ApiOperation({ summary: 'Get closet chat messages in a thread' })
    async getThreadMessages(
        @Req() req: Request,
        @Param('threadId') threadId: string,
        @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetClosetChatMessagesDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.closetChatService.getThreadMessages(userId, threadId, query.page, query.limit);
    }

    @Post('threads/:threadId/messages')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'threadId', description: 'Closet chat thread id' })
    @ApiOperation({ summary: 'Send message in closet chat thread' })
    async sendMessage(
        @Req() req: Request,
        @Param('threadId') threadId: string,
        @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: SendClosetChatMessageDto,
    ) {
        const userId = (req.user as any)?.userId;
        return this.closetChatService.sendMessage(userId, threadId, dto.message);
    }

    @Patch('messages/:messageId/seen')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiParam({ name: 'messageId', description: 'Closet chat message id' })
    @ApiOperation({ summary: 'Mark closet chat message as seen' })
    async markMessageSeen(@Req() req: Request, @Param('messageId') messageId: string) {
        const userId = (req.user as any)?.userId;
        return this.closetChatService.markMessageSeen(userId, messageId);
    }
}
