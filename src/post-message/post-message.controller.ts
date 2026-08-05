import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CreatePostMessageDto } from './dto/create-post-message.dto';
import { UpdatePostMessageDto } from './dto/update-post-message.dto';
import { PostMessageService } from './post-message.service';

@ApiTags('post-message')
@Controller('post-message')
export class PostMessageController {
  constructor(private readonly postMessageService: PostMessageService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update my post messages. Send one or more message fields.' })
  async upsertMine(@Req() req: Request, @Body() dto: CreatePostMessageDto) {
    const userId = (req.user as any).userId;
    return this.postMessageService.upsertMine(userId, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my post message' })
  async findMine(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.postMessageService.findMine(userId);
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get post message by user ID' })
  async findByUserId(@Param('userId') userId: string) {
    return this.postMessageService.findByUserId(userId);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my post message' })
  async updateMine(@Req() req: Request, @Body() dto: UpdatePostMessageDto) {
    const userId = (req.user as any).userId;
    return this.postMessageService.updateMine(userId, dto);
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my post message' })
  async removeMine(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.postMessageService.removeMine(userId);
  }
}
