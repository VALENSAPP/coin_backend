import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeritIncentivesService } from './providers/merit.service';
import { PointsComService } from './providers/points-com.service';
import { ExpediaService } from './providers/expedia.service';
import {
  CalculateQuoteDto,
  GetCatalogQueryDto,
  LinkLoyaltyAccountDto,
  RedeemPointsDto,
  RedemptionHistoryQueryDto,
  RewardCategoryEnum,
  RewardProviderEnum,
} from './dto/rewards.dto';
import {
  IRewardProvider,
  RewardQuote,
} from './interfaces/reward-provider.interface';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);
  private readonly providers: Map<RewardProviderEnum, IRewardProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly meritService: MeritIncentivesService,
    private readonly pointsComService: PointsComService,
    private readonly expediaService: ExpediaService,
  ) {
    this.providers.set(RewardProviderEnum.MERIT, this.meritService);
    this.providers.set(RewardProviderEnum.POINTS_COM, this.pointsComService);
    this.providers.set(RewardProviderEnum.EXPEDIA, this.expediaService);
  }

  private getProvider(providerEnum: RewardProviderEnum): IRewardProvider {
    const provider = this.providers.get(providerEnum);
    if (!provider) {
      throw new BadRequestException(`Unsupported reward provider: ${providerEnum}`);
    }
    return provider;
  }

  /**
   * Get dynamic reward catalog grouped by category & partner
   */
  async getCatalog(query: GetCatalogQueryDto) {
    const catalog = [
      // 1. Airline Miles (Points.com)
      ...this.pointsComService
        .getSupportedPrograms()
        .filter((p) => p.category === 'AIRLINE_MILES')
        .map((p) => ({
          ...p,
          provider: RewardProviderEnum.POINTS_COM,
          categoryDisplay: '✈️ Transfer to Airline Miles',
          description: 'Convert Valens Points into airline frequent flyer miles at partner rates.',
        })),
      // 2. Hotel Points (Points.com)
      ...this.pointsComService
        .getSupportedPrograms()
        .filter((p) => p.category === 'HOTEL_POINTS')
        .map((p) => ({
          ...p,
          provider: RewardProviderEnum.POINTS_COM,
          categoryDisplay: '🏨 Transfer to Hotel Points',
          description: 'Convert Valens Points directly into global hotel chain points.',
        })),
      // 3. Travel Booking (Expedia)
      ...this.expediaService.getSupportedPrograms().map((p) => ({
        ...p,
        provider: RewardProviderEnum.EXPEDIA,
        categoryDisplay: '✈️ Book Travel with Valens Points',
        description: 'Spend Valens Points directly towards hotel stays, flights, and vacation packages.',
      })),
      // 4. Gift Cards, Shopping & Experiences (Merit)
      ...this.meritService.getSupportedPrograms().map((p) => ({
        ...p,
        provider: RewardProviderEnum.MERIT,
        categoryDisplay:
          p.category === 'GIFT_CARD'
            ? '🎁 Gift Cards'
            : p.category === 'SHOPPING'
            ? '🛍️ Shopping'
            : '🎟️ Experiences',
        description: 'Exchange Valens Points for instant digital gift cards or luxury experiences.',
      })),
    ];

    let filtered = catalog;
    if (query.category) {
      filtered = filtered.filter((item) => item.category === query.category);
    }
    if (query.provider) {
      filtered = filtered.filter((item) => item.provider === query.provider);
    }

    return {
      total: filtered.length,
      categories: [
        {
          key: RewardCategoryEnum.AIRLINE_MILES,
          title: 'Airline Miles',
          icon: '✈️',
          provider: 'Points.com / Merit',
        },
        {
          key: RewardCategoryEnum.HOTEL_POINTS,
          title: 'Hotel Points',
          icon: '🏨',
          provider: 'Points.com / Merit',
        },
        {
          key: RewardCategoryEnum.TRAVEL_BOOKING,
          title: 'Direct Travel Booking',
          icon: '🌴',
          provider: 'Expedia Group',
        },
        {
          key: RewardCategoryEnum.GIFT_CARD,
          title: 'Gift Cards',
          icon: '🎁',
          provider: 'Merit Incentives',
        },
        {
          key: RewardCategoryEnum.SHOPPING,
          title: 'Shopping',
          icon: '🛍️',
          provider: 'Merit Incentives',
        },
        {
          key: RewardCategoryEnum.EXPERIENCES,
          title: 'Experiences',
          icon: '🎟️',
          provider: 'Merit Incentives',
        },
      ],
      items: filtered,
    };
  }

  /**
   * Calculate live quote for points redemption
   */
  async calculateQuote(dto: CalculateQuoteDto): Promise<RewardQuote> {
    const provider = this.getProvider(dto.provider);
    return provider.calculateQuote(dto.category, dto.programCode, dto.valensPoints);
  }

  /**
   * List user's linked airline / hotel loyalty accounts
   */
  async getLinkedAccounts(userId: string) {
    const accounts = await (this.prisma as any).userLoyaltyAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return accounts;
  }

  /**
   * Link an external loyalty program account
   */
  async linkLoyaltyAccount(userId: string, dto: LinkLoyaltyAccountDto) {
    const provider = this.getProvider(dto.provider);

    // Validate account format with partner adapter
    const validation = await provider.validateLoyaltyAccount(
      dto.programCode,
      dto.accountNumber,
      dto.accountName,
    );

    if (!validation.isValid) {
      throw new BadRequestException(
        validation.message || 'Invalid loyalty account number or verification failed',
      );
    }

    try {
      const created = await (this.prisma as any).userLoyaltyAccount.upsert({
        where: {
          userId_provider_programCode_accountNumber: {
            userId,
            provider: dto.provider,
            programCode: dto.programCode,
            accountNumber: dto.accountNumber,
          },
        },
        update: {
          accountName: dto.accountName,
          programName: dto.programName,
          isVerified: true,
        },
        create: {
          userId,
          provider: dto.provider,
          programCode: dto.programCode,
          programName: dto.programName,
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          isVerified: true,
        },
      });

      return {
        message: 'Loyalty account linked successfully',
        account: created,
      };
    } catch (error: any) {
      this.logger.error(`Error linking loyalty account: ${error.message}`);
      throw new BadRequestException('Failed to link loyalty account');
    }
  }

  /**
   * Unlink a loyalty account
   */
  async unlinkLoyaltyAccount(userId: string, accountId: string) {
    const account = await (this.prisma as any).userLoyaltyAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new NotFoundException('Linked loyalty account not found');
    }

    await (this.prisma as any).userLoyaltyAccount.delete({
      where: { id: accountId },
    });

    return { message: 'Loyalty account unlinked successfully' };
  }

  /**
   * Execute points redemption with 2-phase transactional safety
   */
  async redeemPoints(userId: string, dto: RedeemPointsDto) {
    // 1. Check idempotency to prevent double-spending
    const existingTx = await (this.prisma as any).pointsRedemption.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingTx) {
      if (existingTx.userId !== userId) {
        throw new ConflictException('Idempotency key collision');
      }
      return {
        message: 'Redemption already submitted (idempotent result)',
        redemption: existingTx,
      };
    }

    // 2. Fetch user and verify balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totalPlatformPoints: true, email: true, userName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = user.totalPlatformPoints ?? 0;
    if (currentBalance < dto.valensPoints) {
      throw new BadRequestException(
        `Insufficient Valens Points balance. Required: ${dto.valensPoints}, Available: ${currentBalance}`,
      );
    }

    // 3. Resolve destination account details
    let targetAccountNumber = dto.accountNumber;
    let targetAccountName = dto.accountName;

    if (dto.linkedAccountId) {
      const linked = await (this.prisma as any).userLoyaltyAccount.findFirst({
        where: { id: dto.linkedAccountId, userId },
      });
      if (!linked) {
        throw new NotFoundException('Specified linked loyalty account not found');
      }
      targetAccountNumber = linked.accountNumber;
      targetAccountName = linked.accountName || user.userName || undefined;
    }

    const provider = this.getProvider(dto.provider);

    // 4. Calculate fresh exchange quote
    const quote = await provider.calculateQuote(
      dto.category,
      dto.programCode,
      dto.valensPoints,
    );

    if (dto.valensPoints < quote.minPoints) {
      throw new BadRequestException(
        `Minimum redemption for this partner is ${quote.minPoints} Valens Points`,
      );
    }
    if (dto.valensPoints > quote.maxPoints) {
      throw new BadRequestException(
        `Maximum redemption for this partner is ${quote.maxPoints} Valens Points`,
      );
    }

    // 5. Phase 1: Atomic point deduction and redemption record creation in PENDING state
    const redemptionRecord = await this.prisma.$transaction(async (tx) => {
      // Re-verify balance inside transaction
      const lockedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { totalPlatformPoints: true },
      });

      if ((lockedUser?.totalPlatformPoints ?? 0) < dto.valensPoints) {
        throw new BadRequestException('Insufficient point balance during transaction locking');
      }

      // Decrement user balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { totalPlatformPoints: { decrement: dto.valensPoints } },
        select: { totalPlatformPoints: true },
      });

      // Create redemption in PENDING status
      const createdRedemption = await (tx as any).pointsRedemption.create({
        data: {
          userId,
          provider: dto.provider,
          category: dto.category,
          partnerProgramCode: dto.programCode,
          valensPointsSpent: dto.valensPoints,
          rewardAmountReceived: quote.rewardAmount,
          exchangeRate: quote.exchangeRate,
          feePoints: quote.feePoints || 0,
          status: 'PENDING',
          idempotencyKey: dto.idempotencyKey,
          metadata: {
            programName: quote.partnerProgramName,
            rewardUnit: quote.rewardUnit,
            accountNumber: targetAccountNumber,
            accountName: targetAccountName,
            userBalanceAfter: updatedUser.totalPlatformPoints,
            ...dto.metadata,
          },
        },
      });

      return createdRedemption;
    });

    // 6. Phase 2: Call third-party provider API
    let executionResult;
    try {
      executionResult = await provider.executeRedemption({
        redemptionId: redemptionRecord.id,
        userId,
        category: dto.category,
        programCode: dto.programCode,
        valensPoints: dto.valensPoints,
        expectedRewardAmount: quote.rewardAmount,
        accountNumber: targetAccountNumber,
        accountName: targetAccountName,
        metadata: dto.metadata,
      });
    } catch (err: any) {
      this.logger.error(
        `Provider execution threw an exception for redemption ${redemptionRecord.id}: ${err.message}`,
      );
      executionResult = {
        success: false,
        externalReferenceId: '',
        rewardAmountReceived: 0,
        status: 'FAILED' as const,
        failureReason: err.message || 'Third party provider communication error',
      };
    }

    // 7. Phase 3: Update status or Rollback points if failed
    if (executionResult.success) {
      const finalRecord = await (this.prisma as any).pointsRedemption.update({
        where: { id: redemptionRecord.id },
        data: {
          status: executionResult.status,
          externalReferenceId: executionResult.externalReferenceId,
          metadata: {
            ...(redemptionRecord.metadata as any),
            ...executionResult.metadata,
          },
        },
      });

      return {
        message: 'Points redemption submitted successfully',
        redemption: finalRecord,
      };
    } else {
      // Rollback points back to user wallet
      this.logger.warn(
        `Redemption ${redemptionRecord.id} failed from provider. Refunding ${dto.valensPoints} points to user ${userId}`,
      );

      const rollbackRecord = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { totalPlatformPoints: { increment: dto.valensPoints } },
        });

        return (tx as any).pointsRedemption.update({
          where: { id: redemptionRecord.id },
          data: {
            status: 'FAILED',
            failureReason: executionResult.failureReason || 'Provider processing failure',
            metadata: {
              ...(redemptionRecord.metadata as any),
              refundedAt: new Date().toISOString(),
              refundReason: executionResult.failureReason,
            },
          },
        });
      });

      throw new BadRequestException({
        message: 'Redemption failed and points have been refunded.',
        error: executionResult.failureReason,
        redemption: rollbackRecord,
      });
    }
  }

  /**
   * Get user's redemption history
   */
  async getRedemptionHistory(userId: string, query: RedemptionHistoryQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.category) where.category = query.category;
    if (query.provider) where.provider = query.provider;

    const [items, total] = await Promise.all([
      (this.prisma as any).pointsRedemption.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).pointsRedemption.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Webhook handler for async status callbacks from Merit / Points.com / Expedia
   */
  async handleProviderWebhook(
    provider: RewardProviderEnum,
    payload: any,
  ) {
    this.logger.log(`Received webhook from provider ${provider}: ${JSON.stringify(payload)}`);

    const externalRef = payload.externalReferenceId || payload.orderId || payload.transactionId;
    if (!externalRef) {
      return { status: 'IGNORED', message: 'No reference ID in payload' };
    }

    const redemption = await (this.prisma as any).pointsRedemption.findFirst({
      where: { externalReferenceId: externalRef },
    });

    if (!redemption) {
      return { status: 'NOT_FOUND', message: 'Redemption record not found' };
    }

    const newStatus =
      payload.status === 'SUCCESS' || payload.status === 'COMPLETED'
        ? 'COMPLETED'
        : payload.status === 'FAILED'
        ? 'FAILED'
        : redemption.status;

    // If webhook marks previously pending/processing as failed, refund points
    if (newStatus === 'FAILED' && redemption.status !== 'FAILED') {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: redemption.userId },
          data: { totalPlatformPoints: { increment: redemption.valensPointsSpent } },
        });

        await (tx as any).pointsRedemption.update({
          where: { id: redemption.id },
          data: {
            status: 'FAILED',
            failureReason: payload.reason || 'Failed via provider webhook notification',
          },
        });
      });
      return { status: 'REFUNDED_AND_MARKED_FAILED' };
    }

    await (this.prisma as any).pointsRedemption.update({
      where: { id: redemption.id },
      data: {
        status: newStatus,
        metadata: {
          ...(redemption.metadata as any),
          lastWebhookUpdate: new Date().toISOString(),
          webhookPayload: payload,
        },
      },
    });

    return { status: 'UPDATED', newStatus };
  }
}
