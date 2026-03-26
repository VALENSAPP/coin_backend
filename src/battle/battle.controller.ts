import { Body, Controller, Get, Post, Query, Req, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { BattleService } from './battle.service';
import { BattleCloseDto, BattleCommentDto, BattleCommentLikeDto, BattleInviteDto, BattleJoinDto, BattlePredictionDto, BattleResponseDto, BattleVoteDto } from './dto/battle-actions.dto';
import { CreateBattleDto } from './dto/create-battle.dto';

@ApiTags('battle')
@Controller('battle')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('create')
  @ApiOperation({ summary: 'Create a new battle (poll or head-to-head)' })
  async createBattle(@Req() req: Request, @Body() dto: CreateBattleDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.createBattle(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('invite')
  @ApiOperation({ summary: 'Invite a user to a head-to-head battle' })
  async inviteToBattle(@Req() req: Request, @Body() dto: BattleInviteDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.inviteToBattle(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('accept')
  @ApiOperation({ summary: 'Accept a battle invite' })
  async acceptInvite(@Req() req: Request, @Body() dto: BattleResponseDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.acceptInvite(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('decline')
  @ApiOperation({ summary: 'Decline a battle invite' })
  async declineInvite(@Req() req: Request, @Body() dto: BattleResponseDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.declineInvite(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('join')
  @ApiOperation({ summary: 'Join a poll battle' })
  async joinBattle(@Req() req: Request, @Body() dto: BattleJoinDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.joinBattle(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('predict')
  @ApiOperation({ summary: 'Submit prediction with justification' })
  async submitPrediction(@Req() req: Request, @Body() dto: BattlePredictionDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.submitPrediction(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('comment')
  @ApiOperation({ summary: 'Add a comment/justification' })
  async addComment(@Req() req: Request, @Body() dto: BattleCommentDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.addComment(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('comment/upload')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        battleId: { type: 'string' },
        comment: { type: 'string' },
        parentCommentId: { type: 'string' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['battleId'],
    },
  })
  @ApiOperation({ summary: 'Add a comment with images' })
  async addCommentWithImages(
    @Req() req: Request,
    @Body() dto: BattleCommentDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = (req.user as any)?.userId;
    return this.battleService.addCommentWithImages(userId, dto, files);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('comment/like')
  @ApiOperation({ summary: 'Like a battle comment' })
  async likeComment(@Req() req: Request, @Body() dto: BattleCommentLikeDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.likeComment(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('vote')
  @ApiOperation({ summary: 'Vote in a head-to-head battle' })
  async voteOnDuel(@Req() req: Request, @Body() dto: BattleVoteDto) {
    const userId = (req.user as any)?.userId;
    return this.battleService.voteOnDuel(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('explore')
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiOperation({ summary: 'Explore live battles' })
  async exploreBattles(@Req() req: Request, @Query('status') status?: string) {
    const userId = (req.user as any)?.userId;
    return this.battleService.exploreBattles(userId, status);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('by-user')
  @ApiQuery({ name: 'userId', required: true, type: 'string' })
  @ApiQuery({ name: 'status', required: false, type: 'string' })
  @ApiOperation({ summary: 'Get battles for a user profile' })
  async getBattlesByUser(@Query('userId') userId: string, @Query('status') status?: string) {
    return this.battleService.getBattlesByUser(userId, status);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('get')
  @ApiQuery({ name: 'battleId', required: true, type: 'string' })
  @ApiOperation({ summary: 'Get battle details' })
  async getBattle(@Query('battleId') battleId: string) {
    return this.battleService.getBattle(battleId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('close')
  @ApiOperation({ summary: 'Close battle (internal/cron)' })
  async closeBattle(@Body() dto: BattleCloseDto) {
    return this.battleService.closeBattle(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('resolve')
  @ApiOperation({ summary: 'Resolve battle (internal/cron)' })
  async resolveBattle(@Body() dto: BattleCloseDto) {
    return this.battleService.resolveBattle(dto);
  }
}
