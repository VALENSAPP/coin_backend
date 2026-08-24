import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionCategory, PredictionProvider } from '@prisma/client';
import { PredictionMarket, PredictionMarketStatus, PredictionProviderClient } from './prediction-provider.types';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  if (!text) return false;
  return keywords.some((keyword) => {
    const escaped = escapeRegExp(keyword.trim());
    if (!escaped) return false;
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(text);
  });
}

const SPORTS_SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  CRICKET: ['cricket', 'ipl', 't20', 'odi', 'bcci', 'icc', 'test match', 'wpl'],
  FOOTBALL: [
    'soccer', 'football', 'premier league', 'epl', 'champions league', 'la liga',
    'serie a', 'bundesliga', 'fifa', 'uefa', 'mls', 'copa', 'messi', 'ronaldo',
    'real madrid', 'barcelona', 'arsenal', 'liverpool', 'manchester', 'chelsea',
    'bayern', 'psg', 'ballon dor', 'laliga',
  ],
  BASKETBALL: ['nba', 'basketball', 'wnba', 'euroleague', 'lakers', 'celtics', 'warriors', 'lebron', 'curry'],
  AMERICAN_FOOTBALL: ['nfl', 'super bowl', 'quarterback', 'touchdown', 'afc', 'nfc', 'chiefs', 'eagles', '49ers', 'mahomes'],
  TENNIS: ['tennis', 'atp', 'wta', 'wimbledon', 'us open', 'australian open', 'french open', 'roland garros', 'djokovic', 'alcaraz', 'sinner', 'nadal', 'federer'],
  BASEBALL: ['mlb', 'baseball', 'yankees', 'dodgers', 'world series', 'red sox', 'mets'],
  MMA_BOXING: ['ufc', 'mma', 'boxing', 'fight night', 'knockout', 'mcgregor', 'fury', 'joshua', 'tyson'],
  FORMULA1: ['f1', 'formula 1', 'formula-1', 'grand prix', 'nascar', 'verstappen', 'hamilton', 'ferrari', 'red bull', 'mclaren'],
  HOCKEY: ['nhl', 'hockey', 'stanley cup'],
  ESPORTS: ['esports', 'dota', 'cs:go', 'cs2', 'league of legends', 'lol', 'valorant', 'overwatch'],
};

const SPORTS_TAG_SLUGS: Record<string, string> = {
  CRICKET: 'cricket',
  FOOTBALL: 'soccer',
  BASKETBALL: 'nba',
  AMERICAN_FOOTBALL: 'nfl',
  TENNIS: 'tennis',
  BASEBALL: 'mlb',
  MMA_BOXING: 'ufc',
  FORMULA1: 'formula-1',
  HOCKEY: 'nhl',
  ESPORTS: 'esports',
};

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

  async listMarkets(category: PredictionCategory, subCategory?: string): Promise<PredictionMarket[]> {
    const params = new URLSearchParams({
      active: 'true',
      closed: 'false',
      limit: '100',
      order: 'volume24hr',
      ascending: 'false',
    });

    const normalizedSubCategory = this.normalizeSubCategoryKey(subCategory);
    const tagSlug = this.getTagSlug(category, normalizedSubCategory);
    if (tagSlug) params.set('tag_slug', tagSlug);

    const response = await this.fetchJson(`/markets?${params.toString()}`);
    const markets = Array.isArray(response) ? response : [];

    return markets
      .map((market: any) => this.toPredictionMarket(market, category))
      .filter((market: PredictionMarket | null): market is PredictionMarket => !!market)
      .filter((market: PredictionMarket) => this.isOpenFutureMarket(market))
      .filter((market: PredictionMarket) => this.matchesCategory(market.raw, category))
      .filter((market: PredictionMarket) => this.matchesSubCategory(market, normalizedSubCategory));
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
        signal: AbortSignal.timeout(5000),
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
    const subCategory = this.inferSubCategory(market, category);

    return {
      provider: this.provider,
      externalMarketId,
      externalEventId: market?.eventId || market?.event_id || market?.conditionId || null,
      category,
      subCategory,
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

  private getTagSlug(category: PredictionCategory, normalizedSubCategory?: string | null): string {
    if (category === PredictionCategory.SPORTS && normalizedSubCategory && SPORTS_TAG_SLUGS[normalizedSubCategory]) {
      return SPORTS_TAG_SLUGS[normalizedSubCategory];
    }

    const tags: Record<PredictionCategory, string> = {
      [PredictionCategory.SPORTS]: 'sports',
      [PredictionCategory.FINANCE]: 'finance',
      [PredictionCategory.ELECTIONS]: 'politics',
      [PredictionCategory.CRYPTO]: 'crypto',
    };
    return tags[category];
  }

  private getSearchableText(market: any): string {
    const parts: string[] = [];
    if (market?.question) parts.push(String(market.question));
    if (market?.title) parts.push(String(market.title));
    if (market?.description) parts.push(String(market.description));
    if (market?.slug) parts.push(String(market.slug).replace(/[-_]/g, ' '));
    if (market?.category) parts.push(String(market.category));
    if (Array.isArray(market?.tags)) {
      for (const tag of market.tags) {
        if (typeof tag === 'string') parts.push(tag);
        else if (tag?.label || tag?.slug || tag?.name) parts.push(String(tag.label || tag.slug || tag.name));
      }
    }
    if (Array.isArray(market?.events)) {
      for (const event of market.events) {
        if (event?.title) parts.push(String(event.title));
        if (event?.description) parts.push(String(event.description));
        if (event?.slug) parts.push(String(event.slug).replace(/[-_]/g, ' '));
        if (event?.seriesSlug) parts.push(String(event.seriesSlug).replace(/[-_]/g, ' '));
        if (Array.isArray(event?.series)) {
          for (const s of event.series) {
            if (s?.title) parts.push(String(s.title));
            if (s?.slug) parts.push(String(s.slug).replace(/[-_]/g, ' '));
          }
        }
      }
    }
    return parts.join(' ');
  }

  private matchesCategory(raw: unknown, category: PredictionCategory): boolean {
    const text = this.getSearchableText(raw);
    const keywordsByCategory: Record<PredictionCategory, string[]> = {
      [PredictionCategory.SPORTS]: [
        'sport',
        'sports',
        'cricket',
        'ipl',
        'nba',
        'nfl',
        'mlb',
        'nhl',
        'soccer',
        'football',
        'tennis',
        'ufc',
        'fifa',
        'formula 1',
        'f1',
        'boxing',
        'mma',
        'basketball',
        'baseball',
        'la liga',
        'premier league',
        'champions league',
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
        'fomc',
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

    return textMatchesKeywords(text, keywordsByCategory[category]);
  }

  private normalizeSubCategoryKey(subCategory?: string | null): string | null {
    if (!subCategory) return null;
    const clean = subCategory.trim().toUpperCase().replace(/[\s-_]+/g, '_');
    if (clean === 'ALL') return null;

    if (clean === 'SOCCER') return 'FOOTBALL';
    if (clean === 'BOXING' || clean === 'UFC' || clean === 'MMA') return 'MMA_BOXING';
    if (clean === 'F1' || clean === 'FORMULA_1' || clean === 'MOTORSPORT') return 'FORMULA1';

    for (const key of Object.keys(SPORTS_SUBCATEGORY_KEYWORDS)) {
      if (key === clean) return key;
    }

    for (const [key, keywords] of Object.entries(SPORTS_SUBCATEGORY_KEYWORDS)) {
      if (keywords.some((k) => k.toUpperCase().replace(/\s+/g, '_') === clean)) {
        return key;
      }
    }

    return clean;
  }

  private inferSubCategory(market: any, category: PredictionCategory): string | null {
    if (category !== PredictionCategory.SPORTS) return null;

    const text = this.getSearchableText(market);
    for (const [subCat, keywords] of Object.entries(SPORTS_SUBCATEGORY_KEYWORDS)) {
      if (textMatchesKeywords(text, keywords)) {
        return subCat;
      }
    }

    return 'OTHER';
  }

  private matchesSubCategory(market: PredictionMarket, normalizedSubCategory?: string | null): boolean {
    if (!normalizedSubCategory) return true;
    if (market.subCategory && market.subCategory === normalizedSubCategory) return true;

    const keywords = SPORTS_SUBCATEGORY_KEYWORDS[normalizedSubCategory] || [normalizedSubCategory.toLowerCase()];
    const text = this.getSearchableText(market.raw);
    return textMatchesKeywords(text, keywords);
  }

  private inferCategory(market: any): PredictionCategory {
    const text = this.getSearchableText(market);
    if (textMatchesKeywords(text, ['sport', 'cricket', 'ipl', 'nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football', 'tennis', 'ufc', 'f1', 'basketball', 'baseball'])) {
      return PredictionCategory.SPORTS;
    }
    if (textMatchesKeywords(text, ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'xrp'])) {
      return PredictionCategory.CRYPTO;
    }
    if (textMatchesKeywords(text, ['election', 'president', 'senate', 'house', 'politics', 'vote'])) {
      return PredictionCategory.ELECTIONS;
    }
    return PredictionCategory.FINANCE;
  }
}
