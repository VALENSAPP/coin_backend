export interface RewardQuote {
  category: string;
  provider: string;
  partnerProgramCode: string;
  partnerProgramName: string;
  valensPoints: number;
  rewardAmount: number;
  rewardUnit: string; // 'MILES', 'POINTS', 'USD', 'VOUCHER'
  exchangeRate: number; // e.g. 1.25 (1.25 Valens = 1 Mile)
  feePoints: number;
  minPoints: number;
  maxPoints: number;
  quoteExpiry: Date;
  terms?: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  accountNumber: string;
  accountName?: string;
  programCode: string;
  message?: string;
}

export interface RedemptionExecutionResult {
  success: boolean;
  externalReferenceId: string;
  rewardAmountReceived: number;
  status: 'COMPLETED' | 'PROCESSING' | 'PENDING' | 'FAILED';
  metadata?: Record<string, any>;
  failureReason?: string;
}

export interface IRewardProvider {
  getProviderName(): string;
  
  calculateQuote(
    category: string,
    programCode: string,
    valensPoints: number,
  ): Promise<RewardQuote>;

  validateLoyaltyAccount(
    programCode: string,
    accountNumber: string,
    accountName?: string,
  ): Promise<AccountValidationResult>;

  executeRedemption(params: {
    redemptionId: string;
    userId: string;
    category: string;
    programCode: string;
    valensPoints: number;
    expectedRewardAmount: number;
    accountNumber?: string;
    accountName?: string;
    metadata?: Record<string, any>;
  }): Promise<RedemptionExecutionResult>;

  checkStatus(externalReferenceId: string): Promise<{
    status: 'COMPLETED' | 'PROCESSING' | 'PENDING' | 'FAILED';
    metadata?: Record<string, any>;
  }>;
}
