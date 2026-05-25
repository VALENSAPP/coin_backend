import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { StoryService } from './story.service';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        caption: { type: 'string' },
        type: {
          type: 'string',
          enum: ['normal', 'subscription-content', 'private-circle'],
          default: 'normal',
          description: 'Story type. Defaults to normal when omitted.',
        },
        storyMeta: { type: 'string', description: 'JSON string for story metadata (clips, audio, trims, etc.)' },
        media: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Array of image/video files',
        },
        audio_0: { type: 'string', format: 'binary', description: 'Optional audio file for clip 0' },
        audio_1: { type: 'string', format: 'binary', description: 'Optional audio file for clip 1' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload story media (images/videos)' })
  async uploadStory(
    @Req() req: Request,
    @Body('caption') caption: string,
    @Body('type') type?: string,
    @Body('storyMeta') storyMeta?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = (req.user as any)?.userId;
    return this.storyService.uploadStory(userId, files, caption, storyMeta, type);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('by-user')
  @ApiQuery({ name: 'userId', type: 'string', required: true })
  @ApiQuery({ name: 'time', type: 'string', required: false, description: "Use 'all' to fetch all stories; otherwise last 24 hours" })
  @ApiOperation({ summary: 'View stories uploaded by a user' })
  async viewUserStory(@Req() req: Request, @Query('userId') userId: string, @Query('time') time?: string) {
    const viewerId = (req.user as any)?.userId;
    return this.storyService.viewUserStory(userId, viewerId, time);
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
  @ApiQuery({ name: 'time', type: 'string', required: false, description: "Use 'all' to fetch all stories; otherwise last 24 hours" })
  @ApiOperation({ summary: 'Get following story' })
  async followingStory(@Req() req: Request, @Query('time') time?: string) {
    const userId = (req.user as any)?.userId;
    return this.storyService.followingStory(userId, time);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('view')
  @ApiOperation({ summary: 'Track a story view' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        storyId: { type: 'string', description: 'ID of the story being viewed' },
      },
      required: ['storyId'],
    },
  })
  async viewStory(@Req() req: Request, @Body('storyId') storyId: string) {
    const viewerId = (req.user as any).userId;
    return this.storyService.viewStory(storyId, viewerId);
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

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Post('highlight/create')
      @UseInterceptors(FileInterceptor('coverImage'))
      @ApiConsumes('multipart/form-data')
      @ApiOperation({ summary: 'Create a story highlight' })
      @ApiBody({
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Highlight title' },
            coverImage: { type: 'string', format: 'binary', description: 'Optional cover image file' },
            storyIds: { type: 'array', items: { type: 'string' }, description: 'Optional list of story IDs to add' },
          },
          required: ['title'],
        },
      })
      async createHighlight(
        @Req() req: Request,
        @Body('title') title: string,
        @UploadedFile() coverImage?: Express.Multer.File,
        @Body('storyIds') storyIds?: string[] | string,
      ) {
        const userId = (req.user as any).userId;
        const normalizedStoryIds = this.normalizeStoryIds(storyIds);
        return this.storyService.createHighlight(userId, title, coverImage, normalizedStoryIds);
      }

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Post('highlight/update')
      @UseInterceptors(FileInterceptor('coverImage'))
      @ApiConsumes('multipart/form-data')
      @ApiOperation({ summary: 'Update highlight title or cover' })
      @ApiBody({
        schema: {
          type: 'object',
          properties: {
            highlightId: { type: 'string', description: 'Highlight ID' },
            title: { type: 'string', description: 'Updated title (optional)' },
            coverImage: { type: 'string', format: 'binary', description: 'Updated cover image file (optional)' },
          },
          required: ['highlightId'],
        },
      })
      async updateHighlight(
        @Req() req: Request,
        @Body('highlightId') highlightId: string,
        @Body('title') title?: string,
        @UploadedFile() coverImage?: Express.Multer.File,
      ) {
        const userId = (req.user as any).userId;
        return this.storyService.updateHighlight(userId, highlightId, title, coverImage);
      }

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Post('highlight/add-story')
      @ApiOperation({ summary: 'Add a story to highlight' })
      @ApiBody({
        schema: {
          type: 'object',
          properties: {
            highlightId: { type: 'string', description: 'Highlight ID' },
            storyId: { type: 'string', description: 'Story ID to add' },
            position: { type: 'number', description: 'Optional order position' },
          },
          required: ['highlightId', 'storyId'],
        },
      })
      async addStoryToHighlight(
        @Req() req: Request,
        @Body('highlightId') highlightId: string,
        @Body('storyId') storyId: string,
        @Body('position') position?: number,
      ) {
        const userId = (req.user as any).userId;
        return this.storyService.addStoryToHighlight(userId, highlightId, storyId, position);
      }

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Post('highlight/remove-story')
      @ApiOperation({ summary: 'Remove a story from highlight' })
      @ApiBody({
        schema: {
          type: 'object',
          properties: {
            highlightId: { type: 'string', description: 'Highlight ID' },
            storyId: { type: 'string', description: 'Story ID to remove' },
          },
          required: ['highlightId', 'storyId'],
        },
      })
      async removeStoryFromHighlight(
        @Req() req: Request,
        @Body('highlightId') highlightId: string,
        @Body('storyId') storyId: string,
      ) {
        const userId = (req.user as any).userId;
        return this.storyService.removeStoryFromHighlight(userId, highlightId, storyId);
      }

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Get('highlight/list')
      @ApiOperation({ summary: 'List highlights for authenticated user' })
      async listHighlights(@Req() req: Request) {
        const userId = (req.user as any).userId;
        return this.storyService.listHighlights(userId, userId);
      }

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Get('highlight/by-user')
      @ApiQuery({ name: 'userId', type: 'string', required: true })
      @ApiOperation({ summary: 'List highlights by userId' })
      async listHighlightsByUser(@Req() req: Request, @Query('userId') userId: string) {
        const viewerId = (req.user as any).userId;
        return this.storyService.listHighlights(userId, viewerId);
      }

      @UseGuards(AuthGuard('jwt'))
      @ApiBearerAuth()
      @Get('highlight/get')
      @ApiQuery({ name: 'highlightId', type: 'string', required: true })
      @ApiOperation({ summary: 'Get a highlight with stories' })
      async getHighlight(@Req() req: Request, @Query('highlightId') highlightId: string) {
        const viewerId = (req.user as any).userId;
        return this.storyService.getHighlight(highlightId, viewerId);
      }

      private normalizeStoryIds(storyIds?: string[] | string): string[] | undefined {
        if (!storyIds) return undefined;
        if (Array.isArray(storyIds)) return storyIds;
        const raw = storyIds.trim();
        if (raw === '') return [];
        if (raw.startsWith('[')) {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [raw];
          } catch {
            return [raw];
          }
        }
        return raw.split(',').map(s => s.trim()).filter(Boolean);
      }
}


