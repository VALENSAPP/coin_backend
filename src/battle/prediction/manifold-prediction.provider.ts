import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionCategory, PredictionProvider } from '@prisma/client';
import { PredictionMarket, PredictionMarketStatus, PredictionProviderClient } from './prediction-provider.types';

@Injectable()
export class ManifoldPredictionProvider implements PredictionProviderClient {
  readonly provider = PredictionProvider.MANIFOLD;

  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('MANIFOLD_API_BASE_URL')
      || 'https://api.manifold.markets'
    ).replace(/\/$/, '');
  }

  async listMarkets(category: PredictionCategory): Promise<PredictionMarket[]> {
    const params = new URLSearchParams({
      limit: '100',
      filter: 'open',
      sort: '24-hour-vol',
      term: this.getSearchTerm(category),
    });

    const response = await this.fetchJson(`/v0/search-markets?${params.toString()}`);
    const markets = Array.isArray(response) ? response : [];

    return markets
      .map((market: any) => this.toPredictionMarket(market, category))
      .filter((market: PredictionMarket | null): market is PredictionMarket => !!market)
      .filter((market: PredictionMarket) => this.isOpenFutureMarket(market))
      .filter((market: PredictionMarket) => this.matchesCategory(market.raw, category));
  }

  async getMarket(externalMarketId: string, category?: PredictionCategory): Promise<PredictionMarket | null> {
    const response = await this.fetchJson(`/v0/market/${encodeURIComponent(externalMarketId)}`);
    return this.toPredictionMarket(response, category || this.inferCategory(response));
  }

  private async fetchJson(path: string): Promise<any> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new ServiceUnavailableException('Prediction provider is unavailable');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`Prediction provider returned ${response.status}`);
    }

    return response.json();
  }

  private toPredictionMarket(market: any, category: PredictionCategory): PredictionMarket | null {
    const externalMarketId = String(market?.id || '').trim();
    const question = String(market?.question || '').trim();
    if (!externalMarketId || !question) return null;

    const options = this.extractOptions(market);
    if (options.length < 2) return null;

    const closeTime = typeof market?.closeTime === 'number' ? new Date(market.closeTime) : null;
    const resultSide = this.extractResultSide(market, options);

    return {
      provider: this.provider,
      externalMarketId,
      externalEventId: null,
      category,
      question,
      options,
      closeTime: closeTime && !Number.isNaN(closeTime.getTime()) ? closeTime : null,
      status: this.normalizeStatus(market, resultSide),
      resultSide,
      raw: market,
    };
  }

  private extractOptions(market: any): string[] {
    if (Array.isArray(market?.answers) && market.answers.length >= 2) {
      return market.answers
        .map((answer: any) => String(answer?.text || answer?.name || '').trim())
        .filter(Boolean);
    }

    if (market?.outcomeType === 'BINARY' || market?.mechanism === 'cpmm-1') {
      return ['YES', 'NO'];
    }

    return [];
  }

  private extractResultSide(market: any, options: string[]): string | null {
    const resolution = String(market?.resolution || '').trim();
    if (!resolution) return null;

    if (resolution === 'YES') return options[0] || 'YES';
    if (resolution === 'NO') return options[1] || 'NO';

    if (Array.isArray(market?.answers)) {
      const answer = market.answers.find((entry: any) => String(entry?.id) === resolution);
      if (answer?.text) return String(answer.text).trim();
    }

    const numericIndex = Number(resolution);
    if (Number.isInteger(numericIndex) && options[numericIndex]) return options[numericIndex];

    return options.find((option) => option.toLowerCase() === resolution.toLowerCase()) || null;
  }

  private normalizeStatus(market: any, resultSide: string | null): PredictionMarketStatus {
    if (resultSide || market?.isResolved === true) return 'SETTLED';
    if (market?.isResolved === false && market?.closeTime && market.closeTime <= Date.now()) return 'CLOSED';
    if (market?.isResolved === false) return 'OPEN';
    return 'UNKNOWN';
  }

  private isOpenFutureMarket(market: PredictionMarket): boolean {
    return market.status === 'OPEN'
      && !!market.closeTime
      && market.closeTime.getTime() > Date.now();
  }

  private getSearchTerm(category: PredictionCategory): string {
    const terms: Record<PredictionCategory, string> = {
      [PredictionCategory.SPORTS]: 'sports',
      [PredictionCategory.FINANCE]: 'finance economy',
      [PredictionCategory.ELECTIONS]: 'election politics',
      [PredictionCategory.CRYPTO]: 'crypto bitcoin',
    };
    return terms[category];
  }

  private matchesCategory(raw: unknown, category: PredictionCategory): boolean {
    const searchable = JSON.stringify(raw || {}).toLowerCase();
    const keywordsByCategory: Record<PredictionCategory, string[]> = {
      [PredictionCategory.SPORTS]: [
        'sport',
        'sports',
        'nba',
        'nfl',
        'mlb',
        'nhl',
        'soccer',
        'football',
        'tennis',
        'ufc',
        'fifa',
      ],
      [PredictionCategory.FINANCE]: [
        'finance',
        'economy',
        'economic',
        'fed',
        'inflation',
        'cpi',
        'interest rate',
        'rate cut',
        'stock',
        'nasdaq',
        's&p',
        'gdp',
      ],
      [PredictionCategory.ELECTIONS]: [
        'election',
        'elections',
        'politics',
        'political',
        'president',
        'senate',
        'house',
        'congress',
        'governor',
        'mayor',
        'vote',
      ],
      [PredictionCategory.CRYPTO]: [
        'crypto',
        'cryptocurrency',
        'bitcoin',
        'btc',
        'ethereum',
        'eth',
        'solana',
        'sol',
        'xrp',
        'doge',
      ],
    };

    return keywordsByCategory[category].some((keyword) => searchable.includes(keyword));
  }

  private inferCategory(market: any): PredictionCategory {
    const searchable = JSON.stringify(market || {}).toLowerCase();
    if (['sport', 'nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football'].some((word) => searchable.includes(word))) {
      return PredictionCategory.SPORTS;
    }
    if (['crypto', 'bitcoin', 'btc', 'ethereum', 'eth'].some((word) => searchable.includes(word))) {
      return PredictionCategory.CRYPTO;
    }
    if (['election', 'president', 'senate', 'house', 'politic'].some((word) => searchable.includes(word))) {
      return PredictionCategory.ELECTIONS;
    }
    return PredictionCategory.FINANCE;
  }
}
