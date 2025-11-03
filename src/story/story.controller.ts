import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { StoryService } from './story.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('story')
@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('upload')
  @UseInterceptors(FilesInterceptor('media'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        caption: { type: 'string' },
        media: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Array of image/video files',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload story media (images/videos)' })
  async uploadStory(
    @Req() req: Request,
    @Body('caption') caption: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = (req.user as any)?.userId;
    return this.storyService.uploadStory(userId, files, caption);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('by-user')
  @ApiQuery({ name: 'userId', type: 'string', required: true })
  @ApiOperation({ summary: 'View stories uploaded by a user' })
  async viewUserStory(@Query('userId') userId: string) {
    return this.storyService.viewUserStory(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('delete')
  @ApiQuery({ name: 'storyId', type: 'string', required: true })
  @ApiOperation({ summary: 'Delete own story' })
  async deleteStory(@Req() req: Request, @Query('storyId') storyId: string) {
    const userId = (req.user as any)?.userId;
    return this.storyService.deleteStory(storyId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('get')
  @ApiOperation({ summary: 'Get following story' })
  async followingStory(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    return this.storyService.followingStory(userId);
  }

    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @Post('commentStory')
    @ApiOperation({ summary: 'Commented on story' })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          comment: { type: 'string', description: 'Comment text' },
          storyId: { type: 'string', description: 'ID of the story to comment on' },
        },
        required: ['comment', 'storyId'],
      },
    })
    async commentOnStory(@Req() req: Request,  @Body('comment') comment: string, @Body('storyId') storyId: string) {
      const userId = (req.user as any).userId;
      return this.storyService.commentOnStory(userId, comment, storyId);
    }

    @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Post('likeStory')
      @ApiOperation({ summary: 'Like or unlike a story' })
      @ApiBody({
        schema: {
          type: 'object',
          properties: {
            storyId: { type: 'string', description: 'ID of the story to like or unlike' },
          },
          required: ['storyId'],
        },
      })
      async storyLikeByUser(
        @Req() req: Request, @Body('storyId') storyId: string
      ) {
        const userId = (req.user as any).userId;
        return this.storyService.storyLikeByUser(storyId, userId);
      }
}


