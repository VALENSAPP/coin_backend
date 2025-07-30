import { Controller, Post, Body, Get, Query, Delete, UseGuards, Req, UseInterceptors, UploadedFiles, ValidationPipe, Param } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { GetPostByIdDto } from './dto/get-post-by-id.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
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
    const userId = (req.user as any).userId; // Use 'sub' instead of 'userId'
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
  @Post('edit/:postId')
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
  async editPost(
    @Req() req: Request,
    @Param('postId') postId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false })) body: EditPostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    console.log(">>>>>>>>>>>>>>>>>>>>>",req.user);
    
    const userId = (req.user as any).userId; // Use 'sub' instead of 'userId'
    console.log(">>>>>>>>>>>>>>>>>>>>>",userId);
    
    return this.postService.editPost(postId, userId, body, files);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('by-user')
  async getPostByUserId(
    @Req() req: Request,
    @Query(new ValidationPipe({ whitelist: true, transform: true })) query: GetPostByUserDto
  ) {
    console.log('Query received:', query);
    console.log('User from JWT:', req.user);
    
    // Use userId from query if provided, otherwise use the authenticated user's ID
    const targetUserId = query.userId || (req.user as any)?.userId; // Use 'sub' instead of 'userId'
    console.log('Target user ID:', targetUserId);
    
    return this.postService.getPostByUserId(targetUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('all')
  async getAllPost() {
    return this.postService.getAllPost();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get(':postId')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'postId', type: 'string', description: 'Post ID' })
  async getPostById(@Param(new ValidationPipe({ whitelist: true })) params: GetPostByIdDto) {
    return this.postService.getPostById(params.postId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('delete')
  async deletePost(@Req() req: Request, @Query(new ValidationPipe({ whitelist: true })) query: DeletePostDto) {
    const userId = (req.user as any).userId; // Use 'sub' instead of 'userId'
    return this.postService.deletePost(query.postId, userId);
  }
} 