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
  @ApiOperation({ summary: 'Create post message for a user. One record per user.' })
  async create(@Req() req: Request, @Body() dto: CreatePostMessageDto) {
    const userId = (req.user as any).userId;
    return this.postMessageService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all post messages' })
  async findAll() {
    return this.postMessageService.findAll();
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

  @Get(':id')
  @ApiOperation({ summary: 'Get post message by ID' })
  async findOne(@Param('id') id: string) {
    return this.postMessageService.findOne(id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my post message' })
  async updateMine(@Req() req: Request, @Body() dto: UpdatePostMessageDto) {
    const userId = (req.user as any).userId;
    return this.postMessageService.updateMine(userId, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update post message by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdatePostMessageDto) {
    return this.postMessageService.update(id, dto);
  }

  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my post message' })
  async removeMine(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.postMessageService.removeMine(userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete post message by ID' })
  async remove(@Param('id') id: string) {
    return this.postMessageService.remove(id);
  }
}
