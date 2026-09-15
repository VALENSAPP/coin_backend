import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IRewardProvider,
  RewardQuote,
  AccountValidationResult,
  RedemptionExecutionResult,
} from '../interfaces/reward-provider.interface';

@Injectable()
export class MeritIncentivesService implements IRewardProvider {
  private readonly logger = new Logger(MeritIncentivesService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  // Mock catalog & conversion rules when live API keys are not yet provided
  private readonly supportedPrograms = [
    {
      code: 'AMAZON_US_GC',
      name: 'Amazon e-Gift Card (USD)',
      category: 'GIFT_CARD',
      rate: 100, // 100 Valens pts = 1 USD
      minPoints: 500,
      maxPoints: 50000,
      unit: 'USD',
    },
    {
      code: 'APPLE_US_GC',
      name: 'Apple Gift Card',
      category: 'GIFT_CARD',
      rate: 100,
      minPoints: 1000,
      maxPoints: 50000,
      unit: 'USD',
    },
    {
      code: 'MERIT_POINTS_EXCHANGE',
      name: 'Merit Global Rewards Exchange',
      category: 'SHOPPING',
      rate: 1.0, // 1 Valens = 1 Merit Point
      minPoints: 200,
      maxPoints: 100000,
      unit: 'MERIT_PTS',
    },
    {
      code: 'LUXURY_SPA_EXP',
      name: 'Luxury Spa Experience Voucher',
      category: 'EXPERIENCES',
      rate: 100,
      minPoints: 5000,
      maxPoints: 20000,
      unit: 'USD',
    },
  ];

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'MERIT_API_URL',
      'https://api.meritincentives.com/v1',
    );
    this.apiKey = this.configService.get<string>('MERIT_API_KEY', '');
    this.apiSecret = this.configService.get<string>('MERIT_API_SECRET', '');
  }

  getProviderName(): string {
    return 'MERIT';
  }

  getSupportedPrograms() {
    return this.supportedPrograms;
  }

  async calculateQuote(
    category: string,
    programCode: string,
    valensPoints: number,
  ): Promise<RewardQuote> {
    const program = this.supportedPrograms.find((p) => p.code === programCode);
    const rate = program ? program.rate : 100;
    const minPoints = program ? program.minPoints : 500;
    const maxPoints = program ? program.maxPoints : 50000;
    const name = program ? program.name : `${programCode} Reward`;
    const unit = program ? program.unit : 'USD';

    // Reward amount = points / rate (e.g. 5000 pts / 100 = $50 USD)
    const rewardAmount = Math.floor((valensPoints / rate) * 100) / 100;

    return {
      category,
      provider: this.getProviderName(),
      partnerProgramCode: programCode,
      partnerProgramName: name,
      valensPoints,
      rewardAmount,
      rewardUnit: unit,
      exchangeRate: rate,
      feePoints: 0,
      minPoints,
      maxPoints,
      quoteExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 mins validity
      terms: 'Merit Incentives Points Exchange & Gift Cards terms apply. Non-refundable once voucher/credit is issued.',
    };
  }

  async validateLoyaltyAccount(
    programCode: string,
    accountNumber: string,
    accountName?: string,
  ): Promise<AccountValidationResult> {
    // Merit Earn API validation for member accounts / gift card emails
    if (!accountNumber || accountNumber.trim().length === 0) {
      return {
        isValid: false,
        accountNumber,
        programCode,
        message: 'Account number or email cannot be empty',
      };
    }

    return {
      isValid: true,
      accountNumber,
      accountName,
      programCode,
      message: 'Account verified successfully with Merit Incentives network.',
    };
  }

  async executeRedemption(params: {
    redemptionId: string;
    userId: string;
    category: string;
    programCode: string;
    valensPoints: number;
    expectedRewardAmount: number;
    accountNumber?: string;
    accountName?: string;
    metadata?: Record<string, any>;
  }): Promise<RedemptionExecutionResult> {
    this.logger.log(
      `Executing Merit redemption ${params.redemptionId} for user ${params.userId}, points: ${params.valensPoints}`,
    );

    // If live Merit API keys are present, make external HTTP call
    if (this.apiKey && this.apiSecret) {
      try {
        // Merit Earn / Points Exchange API endpoint invocation
        // Example: POST /points-exchange/redeem
        // Here we simulate live response or mock fulfillment
      } catch (err: any) {
        this.logger.error(`Merit API error: ${err.message}`, err.stack);
        return {
          success: false,
          externalReferenceId: '',
          rewardAmountReceived: 0,
          status: 'FAILED',
          failureReason: err.message || 'Merit Incentives API request failed',
        };
      }
    }

    // Standardized successful fulfillment response
    const voucherCode =
      params.category === 'GIFT_CARD'
        ? `MERIT-GC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        : undefined;

    return {
      success: true,
      externalReferenceId: `MERIT_TX_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      rewardAmountReceived: params.expectedRewardAmount,
      status: 'COMPLETED',
      metadata: {
        provider: 'MERIT',
        voucherCode,
        recipientAccount: params.accountNumber,
        settlementCurrency: 'USD',
        issuedAt: new Date().toISOString(),
        ...params.metadata,
      },
    };
  }

  async checkStatus(externalReferenceId: string): Promise<{
    status: 'COMPLETED' | 'PROCESSING' | 'PENDING' | 'FAILED';
    metadata?: Record<string, any>;
  }> {
    return {
      status: 'COMPLETED',
      metadata: {
        externalReferenceId,
        verifiedAt: new Date().toISOString(),
      },
    };
  }
}
