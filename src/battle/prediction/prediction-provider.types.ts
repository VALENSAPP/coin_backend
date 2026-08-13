import { PredictionCategory, PredictionProvider } from '@prisma/client';

export type PredictionMarketStatus = 'OPEN' | 'CLOSED' | 'SETTLED' | 'UNKNOWN';

export interface PredictionMarket {
  provider: PredictionProvider;
  externalMarketId: string;
  externalEventId?: string | null;
  category: PredictionCategory;
  question: string;
  options: string[];
  closeTime?: Date | null;
  status: PredictionMarketStatus;
  resultSide?: string | null;
  raw?: unknown;
}

export interface PredictionProviderClient {
  readonly provider: PredictionProvider;
  listMarkets(category: PredictionCategory): Promise<PredictionMarket[]>;
  getMarket(externalMarketId: string, category?: PredictionCategory): Promise<PredictionMarket | null>;
}
