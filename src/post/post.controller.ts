import { Controller, Post, Body, Get, Query, Delete, UseGuards, Req, UseInterceptors, UploadedFiles, ValidationPipe, Param, BadRequestException } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostByUserDto } from './dto/get-post-by-user.dto';
import { GetPostByIdDto } from './dto/get-post-by-id.dto';
import { DeletePostDto } from './dto/delete-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { SharePostDto, DeleteSharedPostDto } from './dto/share-post.dto';
import { PostLikeByUserDto, PostLikeListDto, SavePostDto, UnsavePostDto } from './dto/post-like.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiConsumes, ApiBody, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CommentOnPostDto, GetCommentListOnPostDto, CommentDeleteDto } from './dto/post-comment.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { log } from 'console';

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
        link: { type: 'string', description: 'Link for the post' },
        visibleTo: { type: 'string', description: 'Visibility setting for the post' },
        taggedPeople: { type: 'array', items: { type: 'string' }, description: 'Tagged people user IDs' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Array of image files',
        },
        type: { type: 'string', description: 'Type of post (normal or crowdfunding)' },
        raiseAmount: { type: 'number', description: 'Raise amount for crowdfunding posts' },
        start_time: { type: 'string', format: 'date-time', description: 'Start time for crowdfunding posts' },
        end_time: { type: 'string', format: 'date-time', description: 'End time for crowdfunding posts' },
      },
    },
  })
  async createPost(
    @Req() req: Request,
    @Body(new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors) => new BadRequestException(errors)
    })) body: CreatePostDto,
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
      body.link,
      body.visibleTo,
      body.taggedPeople,
      body.type,
      body.raiseAmount,
      body.start_time,
      body.end_time,
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
        link: { type: 'string', description: 'Link for the post' },
        visibleTo: { type: 'string', description: 'Visibility setting for the post' },
        taggedPeople: { type: 'array', items: { type: 'string' }, description: 'Tagged people user IDs' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Array of image files',
        },
        type: { type: 'string', description: 'Type of post (normal or crowdfunding)' },
        raiseAmount: { type: 'number', description: 'Raise amount for crowdfunding posts' },
        start_time: { type: 'string', format: 'date-time', description: 'Start time for crowdfunding posts' },
        end_time: { type: 'string', format: 'date-time', description: 'End time for crowdfunding posts' },
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
    
    const viewerUserId = (req.user as any)?.userId;
    return this.postService.getPostByUserId(targetUserId, viewerUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('all')
  async getAllPost(@Req() req: Request) {
    const viewerUserId = (req.user as any)?.userId;
    return this.postService.getAllPost(viewerUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('searchAll')
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Search query for users or posts' })
  async searchAllPost(@Req() req: Request, @Query('search') search?: string) {
    const viewerUserId = (req.user as any)?.userId;
    return this.postService.searchAllPost(viewerUserId, search);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('getAllReel')
  async getAllReel(@Req() req: Request) {
    const viewerUserId = (req.user as any)?.userId;
    return this.postService.getAllReel(viewerUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('delete')
  async deletePost(@Req() req: Request, @Query(new ValidationPipe({ whitelist: true })) query: DeletePostDto) {
    const userId = (req.user as any).userId; // Use 'sub' instead of 'userId'
    return this.postService.deletePost(query.postId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('like')
  @ApiOperation({ summary: 'Like or unlike a post' })
  @ApiBody({ type: PostLikeByUserDto })
  async postLikeByUser(
    @Req() req: Request,
    @Body(new ValidationPipe({ whitelist: true })) body: PostLikeByUserDto
  ) {
    const userId = (req.user as any).userId;
    return this.postService.postLikeByUser(body.postId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('like/list')
  @ApiOperation({ summary: 'Get list of users who liked a post' })
  async postLikeList(
    @Query(new ValidationPipe({ whitelist: true })) query: PostLikeListDto
  ) {
    return this.postService.postLikeList(query.postId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('comment')
  @ApiBody({ type: CommentOnPostDto })
  async commentOnPost(@Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: CommentOnPostDto) {
    const userId = (req.user as any).userId;
    return this.postService.commentOnPost(dto.postId, userId, dto.comment);
  }

  @UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Post('editComment')
@ApiBody({ 
  schema: {
    type: 'object',
    properties: {
      commentId: { type: 'string', description: 'ID of the comment to edit' },
      comment: { type: 'string', description: 'New comment text' },
    },
    required: ['commentId', 'comment'],
  }
})
async editComment(
  @Req() req: Request,
  @Body(new ValidationPipe({ whitelist: true })) dto: { commentId: string; comment: string }
) {
  const userId = (req.user as any).userId;
  return this.postService.editComment(dto.commentId, userId, dto.comment);
}


  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('comment/list')
  @ApiQuery({ name: 'postId', type: String, required: true })
  async getCommentListOnPost(@Query(new ValidationPipe({ whitelist: true })) dto: GetCommentListOnPostDto) {
    return this.postService.getCommentListOnPost(dto.postId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('deleteComment')
  @ApiQuery({ name: 'postId', type: String, required: true })
  @ApiQuery({ name: 'commentId', type: String, required: true })
  async deleteComment(@Req() req: Request, @Query(new ValidationPipe({ whitelist: true })) dto: CommentDeleteDto) {
    const userId = (req.user as any).userId;
    return this.postService.commentDelete(dto.postId, dto.commentId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('save')
  @ApiOperation({ summary: 'Save a post for the authenticated user' })
  async savePost(@Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: SavePostDto) {
    const userId = (req.user as any).userId;
    return this.postService.savePost(dto.postId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('unsave')
  @ApiOperation({ summary: 'Unsave a post for the authenticated user' })
  async unsavePost(@Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: UnsavePostDto) {
    const userId = (req.user as any).userId;
    return this.postService.unsavePost(dto.postId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('getSavedPost')
  @ApiOperation({ summary: 'Get saved posts for the authenticated user' })
  async getSavedPosts(@Req() req: Request) {
    console.log(">>>>>>>>>>>>>>>>>>>>>",req.user);

    const userId = (req.user as any).userId;
    return this.postService.getSavedPostsByUser(userId,userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('by-id/:postId')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiParam({ name: 'postId', type: 'string', description: 'Post ID' })
  async getPostById(@Req() req: Request,@Param(new ValidationPipe({ whitelist: true })) params: GetPostByIdDto) {
    const viewerId = (req.user as any)?.userId;
    return this.postService.getPostById(params.postId, viewerId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('sharePost')
  @ApiOperation({ summary: 'Share post to user' })
   @ApiBody({ type: SharePostDto })
  async sharePostToUser(@Body() body: SharePostDto) {
    return this.postService.sharePostToUser(
      body.postId,
      body.sharedUserId,
      body.receiverUserId,
    );
  }

    @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('getShareList')
  @ApiOperation({ summary: 'Get a sharedPostList by ID' })
  async getSharedPostList(@Req() req: Request) {
    const userId = (req.user as any)?.userId;
    return this.postService.getSharedPostList( userId);
  }

  @UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Delete('deleteSharedPost')
@ApiOperation({ summary: 'Delete multiple shared posts by IDs' })
@ApiBody({ type: DeleteSharedPostDto })
async deleteSharedPost(
  @Req() req: Request,
  @Body(new ValidationPipe({ whitelist: true })) dto: DeleteSharedPostDto
) {
  const userId = (req.user as any).userId;
  return this.postService.deleteSharedPosts(dto.shareIds, userId);
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Post('hide')
@ApiOperation({ summary: 'Hide a post for the authenticated user' })
@ApiBody({ schema: { type: 'object', properties: { postId: { type: 'string', description: 'Post ID to hide' } }, required: ['postId'] } })
async hidePost(@Req() req: Request, @Body('postId') postId: string) {
  const userId = (req.user as any).userId;
  return this.postService.hidePost(postId, userId);
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Post('unhide')
@ApiOperation({ summary: 'Unhide a post for the authenticated user' })
@ApiBody({ schema: { type: 'object', properties: { postId: { type: 'string', description: 'Post ID to unhide' } }, required: ['postId'] } })
async unhidePost(@Req() req: Request, @Body('postId') postId: string) {
  const userId = (req.user as any).userId;
  return this.postService.unhidePost(postId, userId);
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Get('getHidePost')
@ApiOperation({ summary: 'Get all hidden posts for the authenticated user' })
async getHidePost(@Req() req: Request) {
  const userId = (req.user as any).userId;
  return this.postService.getHidePost(userId);
}

// Chat functionality endpoints
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Post('sendMessage')
@ApiOperation({ summary: 'Send a message to another user' })
@ApiBody({ type: SendMessageDto })
async sendMessage(@Req() req: Request, @Body(new ValidationPipe({ whitelist: true })) dto: SendMessageDto) {
  const senderId = (req.user as any).userId;
  return this.postService.sendMessage(senderId, dto.receiverId, dto.message);
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Get('conversations')
@ApiOperation({ summary: 'Get all conversations for the authenticated user' })
async getConversations(@Req() req: Request) {
  const userId = (req.user as any).userId;
  return this.postService.getConversations(userId);
}

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Get('conversation/:otherUserId')
@ApiOperation({ summary: 'Get conversation with a specific user' })
@ApiParam({ name: 'otherUserId', type: 'string', description: 'ID of the other user' })
async getConversationWithUser(@Req() req: Request, @Param('otherUserId') otherUserId: string) {
  const userId = (req.user as any).userId;
  return this.postService.getConversationWithUser(userId, otherUserId);
}

}