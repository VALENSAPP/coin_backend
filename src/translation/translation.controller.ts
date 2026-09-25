import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TranslationService } from './translation.service';
import { TranslateTextDto } from './dto/translate-text.dto';
import { TranslateQueryDto } from './dto/translate-query.dto';

@ApiTags('Translation')
@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('translate')
  @ApiOperation({
    summary: 'Translate any text / caption / bio to a target language (default pt)',
    description:
      'Translates arbitrary user text (caption, bio, message) into the requested target language (e.g. pt, es, it, fr, en) with automatic caching.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns translated text with cache metadata',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async translateText(@Body() dto: TranslateTextDto) {
    return this.translationService.translateText(
      dto.text,
      dto.targetLang || 'pt',
      dto.sourceLang,
    );
  }

  @Get('post/:postId')
  @ApiOperation({
    summary: 'On-demand translation of a Post caption and text',
    description:
      'Fetches the post from the database and translates its caption and description text to the target language (default pt).',
  })
  @ApiParam({ name: 'postId', type: 'string', description: 'Post UUID' })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: 'string',
    description: 'Target language code (e.g., pt, es, it, fr, en). Defaults to pt.',
  })
  async translatePost(
    @Param('postId') postId: string,
    @Query() query: TranslateQueryDto,
  ) {
    return this.translationService.translatePost(postId, query.lang || 'pt');
  }

  @Get('user/:userId/bio')
  @ApiOperation({
    summary: 'On-demand translation of a User profile bio',
    description:
      'Fetches the user bio and translates it to the target language (default pt).',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User UUID' })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: 'string',
    description: 'Target language code (e.g., pt, es, it, fr, en). Defaults to pt.',
  })
  async translateUserBio(
    @Param('userId') userId: string,
    @Query() query: TranslateQueryDto,
  ) {
    return this.translationService.translateUserBio(userId, query.lang || 'pt');
  }

  @Get('comment/:commentId')
  @ApiOperation({
    summary: 'On-demand translation of a Post comment',
    description: 'Fetches comment and translates it to the target language (default pt).',
  })
  @ApiParam({ name: 'commentId', type: 'string', description: 'Comment UUID' })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: 'string',
    description: 'Target language code (e.g., pt, es, it, fr, en). Defaults to pt.',
  })
  async translateComment(
    @Param('commentId') commentId: string,
    @Query() query: TranslateQueryDto,
  ) {
    return this.translationService.translateComment(commentId, query.lang || 'pt');
  }

  @Get('story/:storyId')
  @ApiOperation({
    summary: 'On-demand translation of a Story caption',
    description: 'Fetches story caption and translates it to the target language (default pt).',
  })
  @ApiParam({ name: 'storyId', type: 'string', description: 'Story UUID' })
  @ApiQuery({
    name: 'lang',
    required: false,
    type: 'string',
    description: 'Target language code (e.g., pt, es, it, fr, en). Defaults to pt.',
  })
  async translateStory(
    @Param('storyId') storyId: string,
    @Query() query: TranslateQueryDto,
  ) {
    return this.translationService.translateStory(storyId, query.lang || 'pt');
  }

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Get translation cache statistics',
    description: 'Returns total cached items, hit count, miss count, and hit ratio.',
  })
  getCacheStats() {
    return this.translationService.getCacheStats();
  }

  @Post('cache/clear')
  @ApiOperation({
    summary: 'Clear translation cache',
  })
  clearCache() {
    return this.translationService.clearCache();
  }
}
