import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BattleStatus } from '@prisma/client';
import { BattleCommentDto, BattleCommentLikeDto, BattleCloseDto, BattleInviteDto, BattleJoinDto, BattlePredictionDto, BattleResponseDto, BattleVoteDto } from './dto/battle-actions.dto';
import { CreateBattleDto } from './dto/create-battle.dto';
import { uploadImageToS3 } from '../common/s3.util';

const PREDICTION_POINTS = 100;
const LIKE_POINTS = 2;
const MINORITY_BONUS = 50;
const DUEL_BONUS = 50;

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
    return battle;
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

  private async resolvePollBattle(battleId: string, correctSide: string | null) {
    if (!correctSide) throw new BadRequestException('Correct side required to resolve poll');

    const [battle, predictions, commentLikes] = await Promise.all([
      this.prisma.battle.findUnique({ where: { id: battleId } }),
      this.prisma.battlePrediction.findMany({ where: { battleId } }),
      this.prisma.battleCommentLike.findMany({
        where: { comment: { battleId } },
        include: { comment: true },
      }),
    ]);

    if (!battle) throw new NotFoundException('Battle not found');

    const sideCounts = new Map<string, number>();
    predictions.forEach((p) => sideCounts.set(p.side, (sideCounts.get(p.side) || 0) + 1));

    const counts = Array.from(sideCounts.values());
    const minCount = counts.length ? Math.min(...counts) : 0;
    const maxCount = counts.length ? Math.max(...counts) : 0;
    const minoritySides = Array.from(sideCounts.entries())
      .filter(([_, count]) => count === minCount && minCount < maxCount)
      .map(([side]) => side);

    const likesByUser = new Map<string, number>();
    commentLikes.forEach((like) => {
      const ownerId = like.comment.userId;
      likesByUser.set(ownerId, (likesByUser.get(ownerId) || 0) + 1);
    });

    const scored = predictions.map((prediction) => {
      const likes = likesByUser.get(prediction.userId) || 0;
      const isCorrect = prediction.side === correctSide;
      const minorityBonus = isCorrect && minoritySides.includes(prediction.side) ? MINORITY_BONUS : 0;
      const score = (isCorrect ? PREDICTION_POINTS : 0) + likes * LIKE_POINTS + minorityBonus;

      return {
        userId: prediction.userId,
        score,
        likes,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.likes - a.likes);

    const winner = scored[0];

    await this.prisma.$transaction(async (tx) => {
      for (const entry of scored) {
        await tx.battleParticipant.upsert({
          where: { battleId_userId: { battleId, userId: entry.userId } },
          update: { score: entry.score, likesCount: entry.likes, votePoints: 0, isWinner: winner?.userId === entry.userId },
          create: {
            battleId,
            userId: entry.userId,
            score: entry.score,
            likesCount: entry.likes,
            votePoints: 0,
            isWinner: winner?.userId === entry.userId,
          },
        });
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

      await tx.battle.update({
        where: { id: battleId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          closedAt: new Date(),
          correctSide,
          winningSide: correctSide,
          winnerUserId: winner?.userId || null,
        },
      });
    });

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
    const [battle, participants, votes, commentLikes] = await Promise.all([
      this.prisma.battle.findUnique({ where: { id: battleId } }),
      this.prisma.battleParticipant.findMany({ where: { battleId } }),
      this.prisma.battleVote.findMany({ where: { battleId } }),
      this.prisma.battleCommentLike.findMany({
        where: { comment: { battleId } },
        include: { comment: true },
      }),
    ]);

    if (!battle) throw new NotFoundException('Battle not found');

    const voteCounts = new Map<string, number>();
    votes.forEach((v) => voteCounts.set(v.side, (voteCounts.get(v.side) || 0) + 1));

    const likesByUser = new Map<string, number>();
    commentLikes.forEach((like) => {
      const ownerId = like.comment.userId;
      likesByUser.set(ownerId, (likesByUser.get(ownerId) || 0) + 1);
    });

    const scored = participants.map((p) => {
      const votePoints = voteCounts.get(p.side || '') || 0;
      const likes = likesByUser.get(p.userId) || 0;
      const score = votePoints + likes * LIKE_POINTS + DUEL_BONUS;

      return {
        userId: p.userId,
        side: p.side || '',
        score,
        votePoints,
        likes,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.votePoints - a.votePoints || b.likes - a.likes);

    const winner = scored[0];
    const winnerSide = winner?.side || null;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of scored) {
        await tx.battleParticipant.updateMany({
          where: { battleId, userId: entry.userId },
          data: {
            score: entry.score,
            likesCount: entry.likes,
            votePoints: entry.votePoints,
            isWinner: winner?.userId === entry.userId,
          },
        });
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

      await tx.battle.update({
        where: { id: battleId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          closedAt: new Date(),
          winningSide: winnerSide,
          winnerUserId: winner?.userId || null,
        },
      });
    });

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

  private async getFollowerIds(userId: string): Promise<string[]> {
    const followers = await this.prisma.followerAndFollowing.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      select: { followerId: true },
    });
    return followers.map((f) => f.followerId);
  }
}
