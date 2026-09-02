import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionCategory, PredictionProvider } from '@prisma/client';
import * as https from 'node:https';
import * as http from 'node:http';
import { PredictionMarket, PredictionMarketStatus, PredictionProviderClient } from './prediction-provider.types';

export interface LeagueConfig {
  id: number;
  name: string;
  country: string;
}

export const BRAZIL_LEAGUE_MAP: Record<string, LeagueConfig> = {
  BRASILEIRAO_SERIE_A: { id: 71, name: 'Serie A', country: 'Brazil' },
  BRASILEIRAO_SERIE_B: { id: 72, name: 'Serie B', country: 'Brazil' },
  BRASILEIRAO_SERIE_C: { id: 75, name: 'Serie C', country: 'Brazil' },
  BRASILEIRAO_SERIE_D: { id: 76, name: 'Serie D', country: 'Brazil' },
  COPA_DO_BRASIL: { id: 73, name: 'Copa Do Brasil', country: 'Brazil' },
  PAULISTA_A1: { id: 475, name: 'Paulista - A1', country: 'Brazil' },
  PAULISTA_A2: { id: 476, name: 'Paulista - A2', country: 'Brazil' },
  CARIOCA_A1: { id: 624, name: 'Carioca - 1', country: 'Brazil' },
  CARIOCA_A2: { id: 851, name: 'Carioca A2', country: 'Brazil' },
  MINEIRO_1: { id: 629, name: 'Mineiro - 1', country: 'Brazil' },
  GAUCHO_1: { id: 477, name: 'Gaúcho - 1', country: 'Brazil' },
  BAIANO_1: { id: 602, name: 'Baiano - 1', country: 'Brazil' },
  CEARENSE_1: { id: 609, name: 'Cearense - 1', country: 'Brazil' },
  PARANAENSE_1: { id: 606, name: 'Paranaense - 1', country: 'Brazil' },
  CATARINENSE_1: { id: 604, name: 'Catarinense - 1', country: 'Brazil' },
  PERNAMBUCANO_1: { id: 622, name: 'Pernambucano - 1', country: 'Brazil' },
  GOIANO_1: { id: 628, name: 'Goiano - 1', country: 'Brazil' },
  COPA_DO_NORDESTE: { id: 612, name: 'Copa do Nordeste', country: 'Brazil' },
  SUPERCOPA_DO_BRASIL: { id: 632, name: 'Supercopa do Brasil', country: 'Brazil' },
};

export const GLOBAL_LEAGUE_MAP: Record<string, LeagueConfig> = {
  ...BRAZIL_LEAGUE_MAP,
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England' },
  CHAMPIONS_LEAGUE: { id: 2, name: 'UEFA Champions League', country: 'World' },
  LA_LIGA: { id: 140, name: 'La Liga', country: 'Spain' },
  SERIE_A: { id: 135, name: 'Serie A', country: 'Italy' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', country: 'Germany' },
  MLS: { id: 253, name: 'Major League Soccer', country: 'USA' },
  COPA_LIBERTADORES: { id: 13, name: 'Copa Libertadores', country: 'South America' },
  COPA_SUDAMERICANA: { id: 11, name: 'Copa Sudamericana', country: 'South America' },
};

interface CacheEntry {
  expiresAt: number;
  data: any;
}

@Injectable()
export class ApiFootballPredictionProvider implements PredictionProviderClient {
  readonly provider = PredictionProvider.API_FOOTBALL;
  private readonly logger = new Logger(ApiFootballPredictionProvider.name);

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes cache to preserve quota

  constructor(private readonly configService: ConfigService) {
    this.apiKey = (
      this.configService.get<string>('SPORTS_API_KEY')
      || this.configService.get<string>('API_FOOTBALL_KEY')
      || this.configService.get<string>('API_SPORTS_KEY')
      || ''
    ).trim();

    this.baseUrl = (
      this.configService.get<string>('SPORTS_API_BASE_URL')
      || 'https://v3.football.api-sports.io'
    ).trim().replace(/\/$/, '');
  }

  async listMarkets(
    category: PredictionCategory,
    subCategory?: string,
    league?: string,
  ): Promise<PredictionMarket[]> {
    if (category !== PredictionCategory.SPORTS) {
      return [];
    }

    if (!this.apiKey) {
      this.logger.warn('API-Football API key is missing (SPORTS_API_KEY). Returning empty list.');
      return [];
    }

    const normalizedLeague = this.normalizeLeagueKey(league);
    const dateStrings = this.getUpcomingDateStrings(2);
    const fixtures: any[] = [];

    for (const dateStr of dateStrings) {
      const dayFixtures = await this.fetchFixturesByDate(dateStr);
      fixtures.push(...dayFixtures);
    }

    // Deduplicate fixtures by fixture.id
    const seenIds = new Set<number>();
    const uniqueFixtures = fixtures.filter((f) => {
      if (!f?.fixture?.id || seenIds.has(f.fixture.id)) return false;
      seenIds.add(f.fixture.id);
      return true;
    });

    return uniqueFixtures
      .map((fixture) => this.toPredictionMarket(fixture))
      .filter((m): m is PredictionMarket => !!m)
      .filter((m) => this.isOpenFutureMarket(m))
      .filter((m) => this.matchesLeagueFilter(m, normalizedLeague));
  }

  async getMarket(externalMarketId: string, _category?: PredictionCategory): Promise<PredictionMarket | null> {
    if (!this.apiKey) {
      this.logger.warn('API-Football API key is missing. Unable to getMarket.');
      return null;
    }

    const fixtureId = externalMarketId.replace(/^[a-zA-Z_-]+:/, '').trim();
    if (!fixtureId) return null;

    try {
      const cacheKey = `fixture_${fixtureId}`;
      let fixtureData = this.getFromCache(cacheKey);

      if (!fixtureData) {
        const response = await this.fetchJson(`/fixtures?id=${encodeURIComponent(fixtureId)}`);
        fixtureData = Array.isArray(response?.response) ? response.response[0] : null;
        if (fixtureData) {
          // If match is finished, cache longer (1 hour); if live/not started, cache 1 minute
          const isFinished = ['FT', 'AET', 'PEN'].includes(fixtureData?.fixture?.status?.short);
          this.setInCache(cacheKey, fixtureData, isFinished ? 60 * 60 * 1000 : 60 * 1000);
        }
      }

      if (!fixtureData) return null;
      return this.toPredictionMarket(fixtureData);
    } catch (error: any) {
      this.logger.error(`Failed to get fixture ${fixtureId}: ${error.message}`);
      return null;
    }
  }

  private async fetchLeagueFixtures(leagueId: number): Promise<any[]> {
    const currentYear = new Date().getFullYear();
    const cacheKey = `league_${leagueId}_${currentYear}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // First try next 15 fixtures for this league
      const nextResponse = await this.fetchJson(`/fixtures?league=${leagueId}&season=${currentYear}&next=15`);
      let list = Array.isArray(nextResponse?.response) ? nextResponse.response : [];

      if (list.length === 0) {
        // Fallback: check upcoming dates
        const dateStrings = this.getUpcomingDateStrings(5);
        const aggregated: any[] = [];
        for (const dateStr of dateStrings) {
          const dateResp = await this.fetchJson(`/fixtures?league=${leagueId}&date=${dateStr}`);
          if (Array.isArray(dateResp?.response)) {
            aggregated.push(...dateResp.response);
          }
        }
        list = aggregated;
      }

      this.setInCache(cacheKey, list, this.cacheTtlMs);
      return list;
    } catch (e: any) {
      this.logger.error(`Error fetching league fixtures for ${leagueId}: ${e.message}`);
      return [];
    }
  }

  private async fetchFixturesByDate(dateStr: string): Promise<any[]> {
    const cacheKey = `fixtures_date_${dateStr}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchJson(`/fixtures?date=${dateStr}`);
      const rawList: any[] = Array.isArray(response?.response) ? response.response : [];

      // Prioritize Brazilian fixtures or top supported leagues
      const filtered = rawList.filter((item) => {
        const country = String(item?.league?.country || '').toLowerCase();
        const leagueName = String(item?.league?.name || '').toLowerCase();
        return country === 'brazil'
          || country === 'world'
          || country === 'england'
          || country === 'spain'
          || country === 'italy'
          || country === 'germany'
          || leagueName.includes('serie a')
          || leagueName.includes('copa')
          || leagueName.includes('paulista')
          || leagueName.includes('carioca');
      });

      this.setInCache(cacheKey, filtered, this.cacheTtlMs);
      return filtered;
    } catch (e: any) {
      this.logger.error(`Error fetching fixtures for date ${dateStr}: ${e.message}`);
      return [];
    }
  }

  private toPredictionMarket(fixtureData: any): PredictionMarket | null {
    const fixture = fixtureData?.fixture;
    const league = fixtureData?.league;
    const teams = fixtureData?.teams;

    if (!fixture?.id || !teams?.home?.name || !teams?.away?.name) {
      return null;
    }

    const homeTeam = String(teams.home.name).trim();
    const awayTeam = String(teams.away.name).trim();
    const question = `${homeTeam} vs ${awayTeam} - Match Winner`;
    const options = [homeTeam, awayTeam, 'Draw'];

    const closeTimeValue = fixture.date;
    const closeTime = closeTimeValue ? new Date(closeTimeValue) : null;
    const statusShort = String(fixture.status?.short || '').toUpperCase();

    const { status, resultSide } = this.resolveStatusAndWinner(statusShort, teams, fixtureData?.goals);
    const leagueKey = this.inferLeagueKey(league);

    return {
      provider: this.provider,
      externalMarketId: String(fixture.id),
      externalEventId: String(fixture.id),
      category: PredictionCategory.SPORTS,
      subCategory: 'FOOTBALL',
      league: leagueKey,
      question,
      options,
      closeTime: closeTime && !Number.isNaN(closeTime.getTime()) ? closeTime : null,
      status,
      resultSide,
      raw: fixtureData,
    };
  }

  private resolveStatusAndWinner(
    statusShort: string,
    teams: any,
    goals: any,
  ): { status: PredictionMarketStatus; resultSide: string | null } {
    const homeTeam = teams?.home?.name;
    const awayTeam = teams?.away?.name;

    // Settled statuses: FT (Full Time), AET (After Extra Time), PEN (After Penalty Shootout)
    if (['FT', 'AET', 'PEN'].includes(statusShort)) {
      if (teams?.home?.winner === true) {
        return { status: 'SETTLED', resultSide: homeTeam };
      }
      if (teams?.away?.winner === true) {
        return { status: 'SETTLED', resultSide: awayTeam };
      }
      if (goals?.home !== null && goals?.away !== null && goals?.home === goals?.away) {
        return { status: 'SETTLED', resultSide: 'Draw' };
      }
      if (goals?.home > goals?.away) {
        return { status: 'SETTLED', resultSide: homeTeam };
      }
      if (goals?.away > goals?.home) {
        return { status: 'SETTLED', resultSide: awayTeam };
      }
      return { status: 'SETTLED', resultSide: 'Draw' };
    }

    // Cancelled / Postponed
    if (['PST', 'CANC', 'ABD', 'WO', 'INT'].includes(statusShort)) {
      return { status: 'CLOSED', resultSide: null };
    }

    // Live / In Play
    if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'LIVE'].includes(statusShort)) {
      return { status: 'CLOSED', resultSide: null };
    }

    // Not Started (Open for predictions if in future)
    if (['NS', 'TBD'].includes(statusShort)) {
      return { status: 'OPEN', resultSide: null };
    }

    return { status: 'UNKNOWN', resultSide: null };
  }

  private inferLeagueKey(league: any): string {
    const leagueId = Number(league?.id);
    for (const [key, config] of Object.entries(GLOBAL_LEAGUE_MAP)) {
      if (config.id === leagueId) return key;
    }

    const leagueName = String(league?.name || '').toUpperCase().replace(/[\s-_]+/g, '_');
    return leagueName || 'BRAZIL_FOOTBALL';
  }

  private normalizeLeagueKey(league?: string | null): string | null {
    if (!league) return null;
    const clean = league.trim().toUpperCase().replace(/[\s-_]+/g, '_');
    if (clean === 'ALL') return null;

    if (GLOBAL_LEAGUE_MAP[clean]) return clean;

    // Keyword mapping
    if (clean.includes('BRASIL') || clean.includes('BRAZIL') || clean.includes('SERIE_A_BR')) {
      return 'BRASILEIRAO_SERIE_A';
    }
    if (clean.includes('COPA_DO_BRASIL') || clean.includes('COPA_BRASIL')) {
      return 'COPA_DO_BRASIL';
    }
    if (clean.includes('PAULISTA')) return 'PAULISTA_A1';
    if (clean.includes('CARIOCA')) return 'CARIOCA_A1';
    if (clean.includes('PREMIER')) return 'PREMIER_LEAGUE';
    if (clean.includes('CHAMPIONS')) return 'CHAMPIONS_LEAGUE';
    if (clean.includes('LA_LIGA')) return 'LA_LIGA';

    return clean;
  }

  private matchesLeagueFilter(market: PredictionMarket, normalizedLeague?: string | null): boolean {
    if (!normalizedLeague) return true;
    if (market.league === normalizedLeague) return true;

    const raw = market.raw as any;
    const leagueName = String(raw?.league?.name || '').toLowerCase();
    const cleanSearch = normalizedLeague.toLowerCase().replace(/_/g, ' ');
    return leagueName.includes(cleanSearch);
  }

  private isOpenFutureMarket(market: PredictionMarket): boolean {
    return market.status === 'OPEN'
      && !!market.closeTime
      && market.closeTime.getTime() > Date.now();
  }

  private getUpcomingDateStrings(count: number): string[] {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setInCache(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      expiresAt: Date.now() + ttlMs,
      data,
    });
  }

  private async fetchJson(path: string): Promise<any> {
    const fullUrl = `${this.baseUrl}${path}`;
    return new Promise((resolve, reject) => {
      const isHttps = fullUrl.startsWith('https:');
      const client = isHttps ? https : http;

      const req = client.get(
        fullUrl,
        {
          family: 4,
          timeout: 10000,
          headers: {
            Accept: 'application/json',
            'x-apisports-key': this.apiKey,
            'User-Agent': 'Valens-App/1.0',
          },
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(data);
                if (parsed?.errors && Object.keys(parsed.errors).length > 0 && !Array.isArray(parsed.errors)) {
                  this.logger.warn(`API-Sports returned errors: ${JSON.stringify(parsed.errors)}`);
                }
                resolve(parsed);
              } catch (e: any) {
                reject(new ServiceUnavailableException(`Failed to parse API-Football response: ${e.message}`));
              }
            } else {
              reject(new ServiceUnavailableException(`API-Football provider returned HTTP ${res.statusCode}`));
            }
          });
        },
      );

      req.on('error', (err: any) => {
        reject(new ServiceUnavailableException(`API-Football provider unavailable: ${err?.message || err}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new ServiceUnavailableException('API-Football provider request timed out'));
      });
    });
  }
}
