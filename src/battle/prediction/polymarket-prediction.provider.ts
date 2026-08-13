import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionCategory, PredictionProvider } from '@prisma/client';
import { PredictionMarket, PredictionMarketStatus, PredictionProviderClient } from './prediction-provider.types';

@Injectable()
export class PolymarketPredictionProvider implements PredictionProviderClient {
  readonly provider = PredictionProvider.POLYMARKET;

  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('POLYMARKET_GAMMA_API_BASE_URL')
      || 'https://gamma-api.polymarket.com'
    ).replace(/\/$/, '');
  }

  async listMarkets(category: PredictionCategory): Promise<PredictionMarket[]> {
    const params = new URLSearchParams({
      active: 'true',
      closed: 'false',
      limit: '100',
      order: 'volume24hr',
      ascending: 'false',
    });

    const tagSlug = this.getTagSlug(category);
    if (tagSlug) params.set('tag_slug', tagSlug);

    const response = await this.fetchJson(`/markets?${params.toString()}`);
    const markets = Array.isArray(response) ? response : [];

    return markets
      .map((market: any) => this.toPredictionMarket(market, category))
      .filter((market: PredictionMarket | null): market is PredictionMarket => !!market)
      .filter((market: PredictionMarket) => this.isOpenFutureMarket(market))
      .filter((market: PredictionMarket) => this.matchesCategory(market.raw, category));
  }

  async getMarket(externalMarketId: string, category?: PredictionCategory): Promise<PredictionMarket | null> {
    const params = new URLSearchParams({ id: externalMarketId });
    const response = await this.fetchJson(`/markets?${params.toString()}`);
    const market = Array.isArray(response) ? response[0] : response;
    if (!market) return null;

    return this.toPredictionMarket(market, category || this.inferCategory(market));
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
    const externalMarketId = String(market?.id || market?.conditionId || market?.slug || '').trim();
    const question = String(market?.question || market?.title || '').trim();
    if (!externalMarketId || !question) return null;

    const options = this.parseJsonArray(market?.outcomes);
    if (options.length < 2) return null;

    const closeTimeValue = market?.endDate || market?.end_date || market?.closedTime;
    const closeTime = closeTimeValue ? new Date(closeTimeValue) : null;
    const resultSide = this.extractResultSide(market, options);

    return {
      provider: this.provider,
      externalMarketId,
      externalEventId: market?.eventId || market?.event_id || market?.conditionId || null,
      category,
      question,
      options,
      closeTime: closeTime && !Number.isNaN(closeTime.getTime()) ? closeTime : null,
      status: this.normalizeStatus(market, resultSide),
      resultSide,
      raw: market,
    };
  }

  private parseJsonArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];

    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry) => String(entry).trim()).filter(Boolean);
    } catch {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
  }

  private extractResultSide(market: any, options: string[]): string | null {
    const directResult = [
      market?.winner,
      market?.winningOutcome,
      market?.winning_outcome,
      market?.resolvedOutcome,
      market?.resolved_outcome,
    ]
      .map((value) => String(value || '').trim())
      .find(Boolean);

    if (directResult) {
      return options.find((option) => option.toLowerCase() === directResult.toLowerCase()) || directResult;
    }

    const outcomePrices = this.parseJsonArray(market?.outcomePrices)
      .map((price) => Number(price))
      .map((price) => (Number.isFinite(price) ? price : 0));

    const isClosed = market?.closed === true || String(market?.closed || '').toLowerCase() === 'true';
    if (!isClosed || outcomePrices.length !== options.length) return null;

    const maxPrice = Math.max(...outcomePrices);
    if (maxPrice < 0.99) return null;
    const winnerIndex = outcomePrices.findIndex((price) => price === maxPrice);
    return options[winnerIndex] || null;
  }

  private normalizeStatus(market: any, resultSide: string | null): PredictionMarketStatus {
    if (resultSide) return 'SETTLED';
    const closed = market?.closed === true || String(market?.closed || '').toLowerCase() === 'true';
    if (closed) return 'CLOSED';
    const active = market?.active === true || String(market?.active || '').toLowerCase() === 'true';
    if (active) return 'OPEN';
    return 'UNKNOWN';
  }

  private isOpenFutureMarket(market: PredictionMarket): boolean {
    return market.status === 'OPEN'
      && !!market.closeTime
      && market.closeTime.getTime() > Date.now();
  }

  private getTagSlug(category: PredictionCategory): string {
    const tags: Record<PredictionCategory, string> = {
      [PredictionCategory.SPORTS]: 'sports',
      [PredictionCategory.FINANCE]: 'finance',
      [PredictionCategory.ELECTIONS]: 'politics',
      [PredictionCategory.CRYPTO]: 'crypto',
    };
    return tags[category];
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
