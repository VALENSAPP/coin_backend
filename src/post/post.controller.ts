import { Controller, Post, Body, Get, Query, Delete, UseGuards, Req, UseInterceptors, UploadedFiles, ValidationPipe } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('create')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text content of the post' },
        caption: { type: 'string', description: 'Caption for the post' },
        hashtag: { type: 'array', items: { type: 'string' }, description: 'Hashtags for the post' },
        location: { type: 'string', description: 'Location for the post' },
        music: { type: 'string', description: 'Music for the post' },
        taggedPeople: { type: 'array', items: { type: 'string' }, description: 'Tagged people user IDs' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Array of image files',
        },
      },
    },
  })
  async createPost(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) body: CreatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = (req.user as any).userId;
    return this.postService.createPost(
      userId,
      body.text,
      undefined,
      files,
      body.caption,
      body.hashtag,
      body.location,
      body.music,
      body.taggedPeople,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('by-user')
  async getPostByUserId(@Query(new ValidationPipe({ whitelist: true })) query: GetPostByUserDto) {
    return this.postService.getPostByUserId(query.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('all')
  async getAllPost() {
    return this.postService.getAllPost();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('delete')
  async deletePost(@Req() req: Request, @Query(new ValidationPipe({ whitelist: true })) query: DeletePostDto) {
    const userId = (req.user as any).userId;
    return this.postService.deletePost(query.postId, userId);
  }
} 