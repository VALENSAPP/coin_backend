import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BattleStatus } from '@prisma/client';
import { BattleCommentDto, BattleCommentLikeDto, BattleCloseDto, BattleInviteDto, BattleJoinDto, BattlePredictionDto, BattleResponseDto, BattleVoteDto } from './dto/battle-actions.dto';
import { CreateBattleDto } from './dto/create-battle.dto';
import { uploadImageToS3 } from '../common/s3.util';

const BASE_JOIN_POINTS = 5;
const ARGUMENT_POINTS = 10;
const ENGAGEMENT_POINT_PER_LIKE = 2;
const MAX_ENGAGEMENT_POINTS = 20;
const TIMING_BONUS_MAX = 10;
const UNDERDOG_BONUS = 8;
const OPINION_WIN_BONUS = 15;
const OPINION_LOSE_PENALTY = 5;
const PREDICTION_WIN_BONUS = 25;
const PREDICTION_LOSE_PENALTY = 10;
const ARGUMENT_MIN_LENGTH = 10;

@Injectable()
export class BattleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async createBattle(userId: string, dto: CreateBattleDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.question || dto.question.trim() === '') throw new BadRequestException('Question required');
    if (!dto?.endTime) throw new BadRequestException('End time required');

    const startTime = dto.startTime ? new Date(dto.startTime) : undefined;
    const endTime = new Date(dto.endTime);

    if (Number.isNaN(endTime.getTime())) throw new BadRequestException('Invalid end time');
    if (startTime && Number.isNaN(startTime.getTime())) throw new BadRequestException('Invalid start time');
    if (startTime && endTime <= startTime) throw new BadRequestException('End time must be after start time');

    const isHeadToHead = dto.format === 'HEAD_TO_HEAD';
    const status = isHeadToHead ? 'PENDING_INVITE' : 'LIVE';
    const liveAt = status === 'LIVE' ? new Date() : null;

    const battle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.battle.create({
        data: {
          creatorId: userId,
          format: dto.format,
          status,
          question: dto.question.trim(),
          options: dto.options || [],
          startTime: startTime || null,
          endTime,
          resolutionMethod: dto.resolutionMethod || null,
          isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
          stakeAmount: dto.stake ?? null,
          liveAt,
        },
      });

      if (isHeadToHead) {
        if (!dto.invitedUserId) throw new BadRequestException('Invited user required for head-to-head');
        await tx.battleInvite.create({
          data: {
            battleId: created.id,
            inviterId: userId,
            invitedUserId: dto.invitedUserId,
            status: 'PENDING',
          },
        });

        await tx.battleParticipant.create({
          data: {
            battleId: created.id,
            userId,
            side: 'A',
          },
        });
      }

      return created;
    });

    if (!isHeadToHead) {
      const followerIds = await this.getFollowerIds(userId);
      await this.notificationService.sendBattleCreatedToFollowers(
        followerIds,
        battle.id,
        battle.question,
      );
    }

    if (isHeadToHead && dto.invitedUserId) {
      await this.notificationService.sendBattleInvite(dto.invitedUserId, battle.id);
    }

    return battle;
  }

  async inviteToBattle(userId: string, dto: BattleInviteDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId || !dto?.invitedUserId) throw new BadRequestException('Battle ID and invited user required');

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.creatorId !== userId) throw new ForbiddenException('Only creator can invite');
    if (battle.format !== 'HEAD_TO_HEAD') throw new BadRequestException('Invite is only for head-to-head');

    const invite = await this.prisma.battleInvite.upsert({
      where: { battleId_invitedUserId: { battleId: dto.battleId, invitedUserId: dto.invitedUserId } },
      update: { status: 'PENDING', respondedAt: null },
      create: {
        battleId: dto.battleId,
        inviterId: userId,
        invitedUserId: dto.invitedUserId,
        status: 'PENDING',
      },
    });

    await this.prisma.battle.update({
      where: { id: dto.battleId },
      data: { status: 'PENDING_INVITE' },
    });

    await this.notificationService.sendBattleInvite(dto.invitedUserId, dto.battleId);

    return invite;
  }

  async acceptInvite(userId: string, dto: BattleResponseDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId) throw new BadRequestException('Battle ID required');

    const invite = await this.prisma.battleInvite.findFirst({
      where: { battleId: dto.battleId, invitedUserId: userId, status: 'PENDING' },
      include: { battle: true },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    const [updatedInvite, battle] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.battleInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      const updatedBattle = await tx.battle.update({
        where: { id: dto.battleId },
        data: { status: 'LIVE', liveAt: new Date() },
      });

      await tx.battleParticipant.upsert({
        where: { battleId_userId: { battleId: dto.battleId, userId } },
        update: { side: 'B' },
        create: { battleId: dto.battleId, userId, side: 'B' },
      });

      return [updated, updatedBattle] as const;
    });

    await this.notificationService.sendBattleStarted(invite.battle.creatorId, dto.battleId);

    return { invite: updatedInvite, battle };
  }

  async declineInvite(userId: string, dto: BattleResponseDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId) throw new BadRequestException('Battle ID required');

    const invite = await this.prisma.battleInvite.findFirst({
      where: { battleId: dto.battleId, invitedUserId: userId, status: 'PENDING' },
      include: { battle: true },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    const updatedInvite = await this.prisma.battleInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });

    await this.prisma.battle.update({
      where: { id: dto.battleId },
      data: { status: 'CANCELED' },
    });

    await this.notificationService.sendBattleDeclined(invite.battle.creatorId, dto.battleId);

    return updatedInvite;
  }

  async joinBattle(userId: string, dto: BattleJoinDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId) throw new BadRequestException('Battle ID required');

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.format !== 'POLL') throw new BadRequestException('Join only applies to poll battles');
    if (battle.status !== 'LIVE') throw new BadRequestException('Battle is not live');

    return this.prisma.battleParticipant.upsert({
      where: { battleId_userId: { battleId: dto.battleId, userId } },
      update: { side: dto.side || null },
      create: { battleId: dto.battleId, userId, side: dto.side || null },
    });
  }

  async submitPrediction(userId: string, dto: BattlePredictionDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId || !dto?.side || !dto?.justification) {
      throw new BadRequestException('Battle ID, side, and justification required');
    }

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.format !== 'POLL') throw new BadRequestException('Prediction only applies to poll battles');
    if (battle.status !== 'LIVE') throw new BadRequestException('Battle is not live');

    const prediction = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.battlePrediction.upsert({
        where: { battleId_userId: { battleId: dto.battleId, userId } },
        update: { side: dto.side, justification: dto.justification, sourceUrl: dto.sourceUrl || null },
        create: {
          battleId: dto.battleId,
          userId,
          side: dto.side,
          justification: dto.justification,
          sourceUrl: dto.sourceUrl || null,
        },
      });

      await tx.battleParticipant.upsert({
        where: { battleId_userId: { battleId: dto.battleId, userId } },
        update: { side: dto.side },
        create: { battleId: dto.battleId, userId, side: dto.side },
      });

      await tx.battleComment.create({
        data: {
          battleId: dto.battleId,
          userId,
          comment: dto.justification,
        },
      });

      return upserted;
    });

    return prediction;
  }

  async addComment(userId: string, dto: BattleCommentDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId || !dto?.comment) throw new BadRequestException('Battle ID and comment required');

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status !== 'LIVE') throw new BadRequestException('Battle is not live');

    return this.prisma.battleComment.create({
      data: {
        battleId: dto.battleId,
        userId,
        comment: dto.comment,
        parentId: dto.parentCommentId || null,
        images: [],
      },
    });
  }

  async addCommentWithImages(userId: string, dto: BattleCommentDto, files?: Express.Multer.File[]) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId) throw new BadRequestException('Battle ID required');
    if (!dto?.comment && (!files || files.length === 0)) {
      throw new BadRequestException('Comment or images required');
    }

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status !== 'LIVE') throw new BadRequestException('Battle is not live');

    const images = files && files.length > 0
      ? await Promise.all(files.map(file => uploadImageToS3(file, 'battle-comments')))
      : [];

    return this.prisma.battleComment.create({
      data: {
        battleId: dto.battleId,
        userId,
        comment: dto.comment || '',
        parentId: dto.parentCommentId || null,
        images,
      },
    });
  }

  async likeComment(userId: string, dto: BattleCommentLikeDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.commentId) throw new BadRequestException('Comment ID required');

    const existing = await this.prisma.battleCommentLike.findFirst({
      where: { commentId: dto.commentId, userId },
    });

    if (existing) {
      await this.prisma.battleCommentLike.delete({ where: { id: existing.id } });
      return { message: 'Comment unliked', liked: false };
    }

    await this.prisma.battleCommentLike.create({ data: { commentId: dto.commentId, userId } });
    return { message: 'Comment liked', liked: true };
  }

  async voteOnDuel(userId: string, dto: BattleVoteDto) {
    if (!userId) throw new BadRequestException('User ID required');
    if (!dto?.battleId || !dto?.side) throw new BadRequestException('Battle ID and side required');

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.format !== 'HEAD_TO_HEAD') throw new BadRequestException('Vote only applies to head-to-head');
    if (battle.status !== 'LIVE') throw new BadRequestException('Battle is not live');

    return this.prisma.battleVote.upsert({
      where: { battleId_userId: { battleId: dto.battleId, userId } },
      update: { side: dto.side },
      create: { battleId: dto.battleId, userId, side: dto.side },
    });
  }

  async exploreBattles(userId: string, status?: string) {
    const parsedStatus = this.parseBattleStatus(status) || BattleStatus.LIVE;
    return this.prisma.battle.findMany({
      where: {
        status: parsedStatus,
        isPublic: true,
      },
      include: {
        creator: true,
        _count: { select: { participants: true, comments: true, votes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getBattlesByUser(targetUserId: string, status?: string) {
    if (!targetUserId) throw new BadRequestException('User ID required');
    const parsedStatus = this.parseBattleStatus(status);
    return this.prisma.battle.findMany({
      where: {
        ...(parsedStatus ? { status: parsedStatus } : {}),
        OR: [
          { creatorId: targetUserId },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        creator: true,
        _count: { select: { participants: true, comments: true, votes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getBattlePointsByUser(userId: string, status?: string) {
    if (!userId) throw new BadRequestException('User ID required');

    const parsedStatus = this.parseBattleStatus(status);

    const [participants, stats] = await Promise.all([
      this.prisma.battleParticipant.findMany({
        where: {
          userId,
          ...(parsedStatus ? { battle: { status: parsedStatus } } : {}),
        },
        include: {
          battle: true,
        },
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.userBattleStats.findUnique({ where: { userId } }),
    ]);

    const items = participants.map((p) => ({
      battleId: p.battleId,
      format: p.battle.format,
      status: p.battle.status,
      question: p.battle.question,
      side: p.side,
      score: p.score,
      baseJoinPoints: p.baseJoinPoints,
      argumentPoints: p.argumentPoints,
      engagementPoints: p.engagementPoints,
      timingBonus: p.timingBonus,
      underdogBonus: p.underdogBonus,
      winnerBonus: p.winnerBonus,
      loserPenalty: p.loserPenalty,
      argumentSubmitted: p.argumentSubmitted,
      likesCount: p.likesCount,
      votePoints: p.votePoints,
      isWinner: p.isWinner,
      resolvedAt: p.battle.resolvedAt,
      winningSide: p.battle.winningSide,
      correctSide: p.battle.correctSide,
    }));

    const totals = stats || {
      totalBattlePoints: 0,
      totalBattlesJoined: 0,
      totalBattlesWon: 0,
      totalPredictionsCorrect: 0,
      totalPredictionsWrong: 0,
      totalArgumentsSubmitted: 0,
      totalArgumentLikes: 0,
    };

    const predictionTotal = totals.totalPredictionsCorrect + totals.totalPredictionsWrong;
    const predictionAccuracyPercent = predictionTotal > 0
      ? Math.round((totals.totalPredictionsCorrect / predictionTotal) * 100)
      : 0;

    const argumentQualityScore = totals.totalArgumentsSubmitted > 0
      ? Math.min(100, Math.round((totals.totalArgumentLikes / totals.totalArgumentsSubmitted) * 10))
      : 0;

    const credibilityScore = Math.round(
      totals.totalBattlePoints * 0.4
      + predictionAccuracyPercent * 0.4
      + argumentQualityScore * 0.2,
    );

    const level = this.getBattleLevel(totals.totalBattlePoints);

    return {
      userId,
      totals,
      predictionAccuracyPercent,
      argumentQualityScore,
      credibilityScore,
      level,
      items,
    };
  }

  async getBattleWinnerPoints(battleId: string) {
    if (!battleId) throw new BadRequestException('Battle ID required');

    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      select: { id: true, winnerUserId: true, status: true, resolvedAt: true },
    });
    if (!battle) throw new NotFoundException('Battle not found');

    if (!battle.winnerUserId) {
      return {
        battleId: battle.id,
        winnerUserId: null,
        points: null,
        status: battle.status,
        resolvedAt: battle.resolvedAt,
      };
    }

    const participant = await this.prisma.battleParticipant.findUnique({
      where: { battleId_userId: { battleId: battle.id, userId: battle.winnerUserId } },
      select: { score: true },
    });

    return {
      battleId: battle.id,
      winnerUserId: battle.winnerUserId,
      points: participant?.score ?? null,
      status: battle.status,
      resolvedAt: battle.resolvedAt,
    };
  }

  private parseBattleStatus(status?: string): BattleStatus | undefined {
    if (!status) return undefined;
    const normalized = status.trim().toUpperCase();
    const values = Object.values(BattleStatus) as string[];
    if (!values.includes(normalized)) return undefined;
    return normalized as BattleStatus;
  }

  async getBattle(battleId: string) {
    if (!battleId) throw new BadRequestException('Battle ID required');
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        creator: true,
        participants: true,
        predictions: true,
        comments: {
          include: {
            user: true,
            likes: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        votes: true,
      },
    });
    if (!battle) throw new NotFoundException('Battle not found');

    const predictionCountsRaw = await this.prisma.battlePrediction.groupBy({
      by: ['side'],
      where: { battleId },
      _count: { _all: true },
    });

    const predictionCounts = predictionCountsRaw.reduce<Record<string, number>>((acc, row) => {
      acc[row.side] = row._count._all;
      return acc;
    }, {});

    const commentById = new Map<string, any>();
    battle.comments.forEach((comment) => {
      commentById.set(comment.id, { ...comment, replies: [] });
    });

    const nestedComments: any[] = [];
    commentById.forEach((comment) => {
      if (comment.parentId && commentById.has(comment.parentId)) {
        commentById.get(comment.parentId).replies.push(comment);
      } else {
        nestedComments.push(comment);
      }
    });

    const sortByCreatedAtDesc = (items: any[]) => {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      items.forEach((item) => {
        if (Array.isArray(item.replies) && item.replies.length) {
          sortByCreatedAtDesc(item.replies);
        }
      });
    };

    sortByCreatedAtDesc(nestedComments);

    return { ...battle, predictionCounts, comments: nestedComments };
   
  }

  async closeBattle(dto: BattleCloseDto) {
    if (!dto?.battleId) throw new BadRequestException('Battle ID required');

    const battle = await this.prisma.battle.findUnique({ where: { id: dto.battleId } });
    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.status !== 'LIVE') throw new BadRequestException('Battle is not live');

    return this.prisma.battle.update({
      where: { id: dto.battleId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async resolveBattle(dto: BattleCloseDto) {
    if (!dto?.battleId) throw new BadRequestException('Battle ID required');

    const battle = await this.prisma.battle.findUnique({
      where: { id: dto.battleId },
      include: {
        participants: true,
        predictions: true,
      },
    });
    if (!battle) throw new NotFoundException('Battle not found');

    if (battle.format === 'POLL') {
      return this.resolvePollBattle(battle.id, dto.correctSide || null);
    }

    return this.resolveDuelBattle(battle.id);
  }

  async closeExpiredBattles() {
    const now = new Date();
    const battles = await this.prisma.battle.findMany({
      where: {
        status: 'LIVE',
        endTime: { lte: now },
      },
      select: { id: true },
    });

    if (battles.length === 0) return { closed: 0 };

    const result = await this.prisma.battle.updateMany({
      where: {
        id: { in: battles.map((b) => b.id) },
        status: 'LIVE',
      },
      data: { status: 'CLOSED', closedAt: now },
    });

    return { closed: result.count };
  }

  async resolveClosedHeadToHeadBattles() {
    const battles = await this.prisma.battle.findMany({
      where: {
        status: 'CLOSED',
        format: 'HEAD_TO_HEAD',
        resolvedAt: null,
      },
      select: { id: true },
    });

    if (battles.length === 0) return { resolved: 0 };

    for (const battle of battles) {
      await this.resolveDuelBattle(battle.id);
    }

    return { resolved: battles.length };
  }

  async resolveClosedPollBattles() {
    const battles = await this.prisma.battle.findMany({
      where: {
        status: 'CLOSED',
        format: 'POLL',
        resolvedAt: null,
      },
      select: { id: true },
    });

    if (battles.length === 0) return { resolved: 0 };

    let resolvedCount = 0;
    for (const battle of battles) {
      const predictions = await this.prisma.battlePrediction.findMany({
        where: { battleId: battle.id },
      });

      if (predictions.length === 0) continue;

      const sideCounts = new Map<string, number>();
      predictions.forEach((p) => sideCounts.set(p.side, (sideCounts.get(p.side) || 0) + 1));

      const maxCount = Math.max(...Array.from(sideCounts.values()));
      let candidateSides = Array.from(sideCounts.entries())
        .filter(([_, count]) => count === maxCount)
        .map(([side]) => side);

      let correctSide = candidateSides[0];

      if (candidateSides.length > 1) {
        const commentLikes = await this.prisma.battleCommentLike.findMany({
          where: { comment: { battleId: battle.id } },
          include: { comment: true },
        });

        const likesByUser = new Map<string, number>();
        commentLikes.forEach((like) => {
          const ownerId = like.comment.userId;
          likesByUser.set(ownerId, (likesByUser.get(ownerId) || 0) + 1);
        });

        const likesBySide = new Map<string, number>();
        predictions.forEach((p) => {
          const likes = likesByUser.get(p.userId) || 0;
          likesBySide.set(p.side, (likesBySide.get(p.side) || 0) + likes);
        });

        const maxLikes = Math.max(...candidateSides.map((side) => likesBySide.get(side) || 0));
        candidateSides = candidateSides.filter((side) => (likesBySide.get(side) || 0) === maxLikes);

        correctSide = candidateSides.sort()[0];
      }

      await this.resolvePollBattle(battle.id, correctSide);
      resolvedCount += 1;
    }

    return { resolved: resolvedCount };
  }

  private async resolvePollBattle(battleId: string, correctSide: string | null) {
    if (!correctSide) throw new BadRequestException('Correct side required to resolve poll');

    const [battle, predictions, commentLikes, comments, participants] = await Promise.all([
      this.prisma.battle.findUnique({ where: { id: battleId } }),
      this.prisma.battlePrediction.findMany({ where: { battleId } }),
      this.prisma.battleCommentLike.findMany({
        where: { comment: { battleId } },
        include: { comment: true },
      }),
      this.prisma.battleComment.findMany({
        where: { battleId },
        select: { userId: true, comment: true },
      }),
      this.prisma.battleParticipant.findMany({ where: { battleId } }),
    ]);

    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.resolvedAt) {
      return { battleId, winnerUserId: battle.winnerUserId || null };
    }

    const sideCounts = new Map<string, number>();
    predictions.forEach((p) => sideCounts.set(p.side, (sideCounts.get(p.side) || 0) + 1));

    const underdogSide = this.getUnderdogSide(sideCounts);

    const likesByUser = new Map<string, number>();
    commentLikes.forEach((like) => {
      const ownerId = like.comment.userId;
      likesByUser.set(ownerId, (likesByUser.get(ownerId) || 0) + 1);
    });

    const argumentByUser = new Map<string, boolean>();
    comments.forEach((comment) => {
      const isValid = comment.comment.trim().length >= ARGUMENT_MIN_LENGTH;
      if (!isValid) return;
      argumentByUser.set(comment.userId, true);
    });

    const joinedAtByUser = new Map<string, Date>();
    const existingParticipantByUser = new Map<string, typeof participants[number]>();
    participants.forEach((p) => {
      joinedAtByUser.set(p.userId, p.joinedAt);
      existingParticipantByUser.set(p.userId, p);
    });

    const startTime = battle.startTime || battle.liveAt || battle.createdAt;
    const endTime = battle.endTime || battle.closedAt || new Date();

    const scored = predictions.map((prediction) => {
      const likes = likesByUser.get(prediction.userId) || 0;
      const argumentSubmitted = argumentByUser.get(prediction.userId) || false;
      const argumentPoints = argumentSubmitted ? ARGUMENT_POINTS : 0;
      const engagementPoints = Math.min(MAX_ENGAGEMENT_POINTS, likes * ENGAGEMENT_POINT_PER_LIKE);
      const joinedAt = joinedAtByUser.get(prediction.userId) || prediction.createdAt;
      const timingBonus = this.getTimingBonus(joinedAt, startTime, endTime);
      const userWon = prediction.side === correctSide;
      const underdogBonus = underdogSide && prediction.side === underdogSide && userWon ? UNDERDOG_BONUS : 0;
      const winnerBonus = userWon ? PREDICTION_WIN_BONUS : 0;
      const loserPenalty = userWon ? 0 : PREDICTION_LOSE_PENALTY;
      const score = Math.max(
        0,
        BASE_JOIN_POINTS
        + argumentPoints
        + engagementPoints
        + timingBonus
        + underdogBonus
        + winnerBonus
        - loserPenalty,
      );

      return {
        userId: prediction.userId,
        side: prediction.side,
        score,
        likes,
        argumentSubmitted,
        argumentPoints,
        engagementPoints,
        timingBonus,
        underdogBonus,
        winnerBonus,
        loserPenalty,
        userWon,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.engagementPoints - a.engagementPoints || b.likes - a.likes);

    const winner = scored[0];
    let didResolve = false;

    await this.prisma.$transaction(async (tx) => {
      const resolved = await tx.battle.updateMany({
        where: { id: battleId, resolvedAt: null },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          closedAt: new Date(),
          correctSide,
          winningSide: correctSide,
          winnerUserId: winner?.userId || null,
        },
      });

      if (resolved.count === 0) return;
      didResolve = true;

      for (const entry of scored) {
        const existing = existingParticipantByUser.get(entry.userId);
        await tx.battleParticipant.upsert({
          where: { battleId_userId: { battleId, userId: entry.userId } },
          update: {
            score: entry.score,
            baseJoinPoints: BASE_JOIN_POINTS,
            argumentPoints: entry.argumentPoints,
            engagementPoints: entry.engagementPoints,
            timingBonus: entry.timingBonus,
            underdogBonus: entry.underdogBonus,
            winnerBonus: entry.winnerBonus,
            loserPenalty: entry.loserPenalty,
            argumentSubmitted: entry.argumentSubmitted,
            likesCount: entry.likes,
            votePoints: 0,
            isWinner: winner?.userId === entry.userId,
            awardedAt: new Date(),
          },
          create: {
            battleId,
            userId: entry.userId,
            score: entry.score,
            baseJoinPoints: BASE_JOIN_POINTS,
            argumentPoints: entry.argumentPoints,
            engagementPoints: entry.engagementPoints,
            timingBonus: entry.timingBonus,
            underdogBonus: entry.underdogBonus,
            winnerBonus: entry.winnerBonus,
            loserPenalty: entry.loserPenalty,
            argumentSubmitted: entry.argumentSubmitted,
            likesCount: entry.likes,
            votePoints: 0,
            isWinner: winner?.userId === entry.userId,
            awardedAt: new Date(),
          },
        });

        if (!existing?.awardedAt) {
          await tx.userBattleStats.upsert({
            where: { userId: entry.userId },
            update: {
              totalBattlePoints: { increment: entry.score },
              totalBattlesJoined: { increment: 1 },
              totalBattlesWon: { increment: entry.userWon ? 1 : 0 },
              totalPredictionsCorrect: { increment: entry.userWon ? 1 : 0 },
              totalPredictionsWrong: { increment: entry.userWon ? 0 : 1 },
              totalArgumentsSubmitted: { increment: entry.argumentSubmitted ? 1 : 0 },
              totalArgumentLikes: { increment: entry.likes },
            },
            create: {
              userId: entry.userId,
              totalBattlePoints: entry.score,
              totalBattlesJoined: 1,
              totalBattlesWon: entry.userWon ? 1 : 0,
              totalPredictionsCorrect: entry.userWon ? 1 : 0,
              totalPredictionsWrong: entry.userWon ? 0 : 1,
              totalArgumentsSubmitted: entry.argumentSubmitted ? 1 : 0,
              totalArgumentLikes: entry.likes,
            },
          });
        }
      }

      await tx.battleReward.deleteMany({ where: { battleId } });
      const topThree = scored.slice(0, 3);
      for (let i = 0; i < topThree.length; i += 1) {
        await tx.battleReward.create({
          data: {
            battleId,
            userId: topThree[i].userId,
            rank: i + 1,
            rewardPoints: null,
            rewardType: 'CRED',
          },
        });
      }
    });

    if (!didResolve) {
      return { battleId, winnerUserId: battle.winnerUserId || null };
    }

    const participantIds = scored.map((s) => s.userId);
    if (participantIds.length) {
      await this.notificationService.sendBattleResult(participantIds, battleId);
    }

    if (winner?.userId) {
      await this.notificationService.sendBattleVictory(winner.userId, battleId);
    }

    const followerIds = await this.getFollowerIds(battle.creatorId);
    await this.notificationService.sendBattleClosedToFollowers(followerIds, battleId);

    return { battleId, winnerUserId: winner?.userId || null };
  }

  private async resolveDuelBattle(battleId: string) {
    const [battle, participants, votes, commentLikes, comments] = await Promise.all([
      this.prisma.battle.findUnique({ where: { id: battleId } }),
      this.prisma.battleParticipant.findMany({ where: { battleId } }),
      this.prisma.battleVote.findMany({ where: { battleId } }),
      this.prisma.battleCommentLike.findMany({
        where: { comment: { battleId } },
        include: { comment: true },
      }),
      this.prisma.battleComment.findMany({
        where: { battleId },
        select: { userId: true, comment: true },
      }),
    ]);

    if (!battle) throw new NotFoundException('Battle not found');
    if (battle.resolvedAt) {
      return { battleId, winnerUserId: battle.winnerUserId || null };
    }

    const voteCounts = new Map<string, number>();
    participants.forEach((p) => {
      if (!voteCounts.has(p.side || '')) voteCounts.set(p.side || '', 0);
    });
    votes.forEach((v) => voteCounts.set(v.side, (voteCounts.get(v.side) || 0) + 1));

    const likesByUser = new Map<string, number>();
    commentLikes.forEach((like) => {
      const ownerId = like.comment.userId;
      likesByUser.set(ownerId, (likesByUser.get(ownerId) || 0) + 1);
    });

    const argumentByUser = new Map<string, boolean>();
    comments.forEach((comment) => {
      const isValid = comment.comment.trim().length >= ARGUMENT_MIN_LENGTH;
      if (!isValid) return;
      argumentByUser.set(comment.userId, true);
    });

    const underdogSide = this.getUnderdogSide(voteCounts);

    const likesBySide = new Map<string, number>();
    participants.forEach((p) => {
      const likes = likesByUser.get(p.userId) || 0;
      likesBySide.set(p.side || '', (likesBySide.get(p.side || '') || 0) + likes);
    });

    let winningSide: string | null = null;
    if (voteCounts.size > 0) {
      const sides = Array.from(voteCounts.keys()).sort();
      const maxVotes = Math.max(...Array.from(voteCounts.values()));
      let candidates = sides.filter((side) => (voteCounts.get(side) || 0) === maxVotes);

      if (candidates.length > 1) {
        const maxLikes = Math.max(...candidates.map((side) => likesBySide.get(side) || 0));
        candidates = candidates.filter((side) => (likesBySide.get(side) || 0) === maxLikes);
      }

      winningSide = candidates.sort()[0] || null;
    } else if (likesBySide.size > 0) {
      const sides = Array.from(likesBySide.keys()).sort();
      const maxLikes = Math.max(...Array.from(likesBySide.values()));
      const candidates = sides.filter((side) => (likesBySide.get(side) || 0) === maxLikes);
      winningSide = candidates.sort()[0] || null;
    } else if (participants.length > 0) {
      winningSide = participants[0].side || null;
    }

    const startTime = battle.startTime || battle.liveAt || battle.createdAt;
    const endTime = battle.endTime || battle.closedAt || new Date();

    const scored = participants.map((p) => {
      const likes = likesByUser.get(p.userId) || 0;
      const argumentSubmitted = argumentByUser.get(p.userId) || false;
      const argumentPoints = argumentSubmitted ? ARGUMENT_POINTS : 0;
      const engagementPoints = Math.min(MAX_ENGAGEMENT_POINTS, likes * ENGAGEMENT_POINT_PER_LIKE);
      const timingBonus = this.getTimingBonus(p.joinedAt, startTime, endTime);
      const userWon = !!winningSide && p.side === winningSide;
      const underdogBonus = underdogSide && p.side === underdogSide && userWon ? UNDERDOG_BONUS : 0;
      const winnerBonus = userWon ? OPINION_WIN_BONUS : 0;
      const loserPenalty = userWon ? 0 : OPINION_LOSE_PENALTY;
      const votePoints = voteCounts.get(p.side || '') || 0;
      const score = Math.max(
        0,
        BASE_JOIN_POINTS
        + argumentPoints
        + engagementPoints
        + timingBonus
        + underdogBonus
        + winnerBonus
        - loserPenalty,
      );

      return {
        userId: p.userId,
        side: p.side || '',
        score,
        likes,
        votePoints,
        argumentSubmitted,
        argumentPoints,
        engagementPoints,
        timingBonus,
        underdogBonus,
        winnerBonus,
        loserPenalty,
        userWon,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.engagementPoints - a.engagementPoints || b.likes - a.likes);

    const winner = scored.find((entry) => entry.side === winningSide) || scored[0];
    const winnerSide = winningSide || winner?.side || null;
    let didResolve = false;

    await this.prisma.$transaction(async (tx) => {
      const resolved = await tx.battle.updateMany({
        where: { id: battleId, resolvedAt: null },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          closedAt: new Date(),
          winningSide: winnerSide,
          winnerUserId: winner?.userId || null,
        },
      });

      if (resolved.count === 0) return;
      didResolve = true;

      for (const entry of scored) {
        const existing = participants.find((p) => p.userId === entry.userId);
        await tx.battleParticipant.upsert({
          where: { battleId_userId: { battleId, userId: entry.userId } },
          update: {
            score: entry.score,
            baseJoinPoints: BASE_JOIN_POINTS,
            argumentPoints: entry.argumentPoints,
            engagementPoints: entry.engagementPoints,
            timingBonus: entry.timingBonus,
            underdogBonus: entry.underdogBonus,
            winnerBonus: entry.winnerBonus,
            loserPenalty: entry.loserPenalty,
            argumentSubmitted: entry.argumentSubmitted,
            likesCount: entry.likes,
            votePoints: entry.votePoints,
            isWinner: winner?.userId === entry.userId,
            awardedAt: new Date(),
          },
          create: {
            battleId,
            userId: entry.userId,
            side: entry.side,
            score: entry.score,
            baseJoinPoints: BASE_JOIN_POINTS,
            argumentPoints: entry.argumentPoints,
            engagementPoints: entry.engagementPoints,
            timingBonus: entry.timingBonus,
            underdogBonus: entry.underdogBonus,
            winnerBonus: entry.winnerBonus,
            loserPenalty: entry.loserPenalty,
            argumentSubmitted: entry.argumentSubmitted,
            likesCount: entry.likes,
            votePoints: entry.votePoints,
            isWinner: winner?.userId === entry.userId,
            awardedAt: new Date(),
          },
        });

        if (!existing?.awardedAt) {
          await tx.userBattleStats.upsert({
            where: { userId: entry.userId },
            update: {
              totalBattlePoints: { increment: entry.score },
              totalBattlesJoined: { increment: 1 },
              totalBattlesWon: { increment: entry.userWon ? 1 : 0 },
              totalArgumentsSubmitted: { increment: entry.argumentSubmitted ? 1 : 0 },
              totalArgumentLikes: { increment: entry.likes },
            },
            create: {
              userId: entry.userId,
              totalBattlePoints: entry.score,
              totalBattlesJoined: 1,
              totalBattlesWon: entry.userWon ? 1 : 0,
              totalPredictionsCorrect: 0,
              totalPredictionsWrong: 0,
              totalArgumentsSubmitted: entry.argumentSubmitted ? 1 : 0,
              totalArgumentLikes: entry.likes,
            },
          });
        }
      }

      await tx.battleReward.deleteMany({ where: { battleId } });
      if (winner?.userId) {
        await tx.battleReward.create({
          data: {
            battleId,
            userId: winner.userId,
            rank: 1,
            rewardPoints: null,
            rewardType: 'CRED',
          },
        });
      }
    });

    if (!didResolve) {
      return { battleId, winnerUserId: battle.winnerUserId || null };
    }

    const participantIds = scored.map((s) => s.userId);
    if (participantIds.length) {
      await this.notificationService.sendBattleResult(participantIds, battleId);
    }

    if (winner?.userId) {
      await this.notificationService.sendBattleVictory(winner.userId, battleId);
    }

    const followerIds = await this.getFollowerIds(battle.creatorId);
    await this.notificationService.sendBattleClosedToFollowers(followerIds, battleId);

    return { battleId, winnerUserId: winner?.userId || null };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getTimingBonus(joinedAt: Date, startTime?: Date | null, endTime?: Date | null): number {
    if (!startTime || !endTime) return 0;
    const totalDuration = endTime.getTime() - startTime.getTime();
    if (totalDuration <= 0) return 0;
    const elapsed = joinedAt.getTime() - startTime.getTime();
    const ratio = this.clamp(elapsed / totalDuration, 0, 1);
    return Math.round(TIMING_BONUS_MAX * (1 - ratio));
  }

  private getUnderdogSide(counts: Map<string, number>): string | null {
    if (counts.size === 0) return null;
    const values = Array.from(counts.values());
    const minCount = Math.min(...values);
    const maxCount = Math.max(...values);
    if (minCount === maxCount) return null;
    const candidates = Array.from(counts.entries())
      .filter(([_, count]) => count === minCount)
      .map(([side]) => side)
      .sort();
    return candidates[0] || null;
  }

  private getBattleLevel(points: number): string {
    if (points >= 3000) return 'Oracle';
    if (points >= 1500) return 'Expert';
    if (points >= 700) return 'Analyst';
    if (points >= 300) return 'Strategist';
    if (points >= 100) return 'Challenger';
    return 'Rookie';
  }

  async rebuildBattleStats(userId?: string) {
    const participants = await this.prisma.battleParticipant.findMany({
      where: {
        awardedAt: { not: null },
        ...(userId ? { userId } : {}),
        battle: { status: 'RESOLVED' },
      },
      include: {
        battle: true,
      },
    });

    if (participants.length === 0) {
      return { rebuiltUsers: 0 };
    }

    const byUser = new Map<string, {
      totalBattlePoints: number;
      totalBattlesJoined: number;
      totalBattlesWon: number;
      totalPredictionsCorrect: number;
      totalPredictionsWrong: number;
      totalArgumentsSubmitted: number;
      totalArgumentLikes: number;
    }>();

    participants.forEach((p) => {
      const stats = byUser.get(p.userId) || {
        totalBattlePoints: 0,
        totalBattlesJoined: 0,
        totalBattlesWon: 0,
        totalPredictionsCorrect: 0,
        totalPredictionsWrong: 0,
        totalArgumentsSubmitted: 0,
        totalArgumentLikes: 0,
      };

      stats.totalBattlePoints += p.score || 0;
      stats.totalBattlesJoined += 1;
      stats.totalBattlesWon += p.isWinner ? 1 : 0;
      if (p.battle.format === 'POLL') {
        if (p.isWinner) stats.totalPredictionsCorrect += 1;
        else stats.totalPredictionsWrong += 1;
      }
      if (p.argumentSubmitted) stats.totalArgumentsSubmitted += 1;
      stats.totalArgumentLikes += p.likesCount || 0;

      byUser.set(p.userId, stats);
    });

    await this.prisma.$transaction(async (tx) => {
      for (const [uid, stats] of byUser.entries()) {
        await tx.userBattleStats.upsert({
          where: { userId: uid },
          update: {
            totalBattlePoints: stats.totalBattlePoints,
            totalBattlesJoined: stats.totalBattlesJoined,
            totalBattlesWon: stats.totalBattlesWon,
            totalPredictionsCorrect: stats.totalPredictionsCorrect,
            totalPredictionsWrong: stats.totalPredictionsWrong,
            totalArgumentsSubmitted: stats.totalArgumentsSubmitted,
            totalArgumentLikes: stats.totalArgumentLikes,
          },
          create: {
            userId: uid,
            totalBattlePoints: stats.totalBattlePoints,
            totalBattlesJoined: stats.totalBattlesJoined,
            totalBattlesWon: stats.totalBattlesWon,
            totalPredictionsCorrect: stats.totalPredictionsCorrect,
            totalPredictionsWrong: stats.totalPredictionsWrong,
            totalArgumentsSubmitted: stats.totalArgumentsSubmitted,
            totalArgumentLikes: stats.totalArgumentLikes,
          },
        });
      }
    });

    return { rebuiltUsers: byUser.size };
  }

  private async getFollowerIds(userId: string): Promise<string[]> {
    const followers = await this.prisma.followerAndFollowing.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      select: { followerId: true },
    });
    return followers.map((f) => f.followerId);
  }
}
