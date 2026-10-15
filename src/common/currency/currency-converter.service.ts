import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CurrencyConverterService {
  private readonly logger = new Logger(CurrencyConverterService.name);

  // Fallback exchange rate if live API is unreachable
  // 1 USD = 5.50 BRL (approx standard market rate)
  private defaultUsdToBrlRate = 5.5;

  // In-memory cache
  private cachedRates: Record<string, number> = {};
  private lastFetchedAt: number = 0;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    const envRate = parseFloat(
      process.env.USD_TO_BRL_RATE || process.env.USD_BRL_EXCHANGE_RATE || '',
    );
    if (!isNaN(envRate) && envRate > 0) {
      this.defaultUsdToBrlRate = envRate;
    }
  }

  /**
   * Get exchange rate from source currency to target currency.
   * E.g. getExchangeRate('USD', 'BRL') => ~5.50
   * E.g. getExchangeRate('BRL', 'USD') => ~0.1818
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const from = (fromCurrency || '').toUpperCase();
    const to = (toCurrency || '').toUpperCase();

    if (!from || !to || from === to) {
      return 1;
    }

    await this.refreshRatesIfNeeded();

    const fromRate =
      this.cachedRates[from] ??
      (from === 'USD' ? 1 : from === 'BRL' ? this.defaultUsdToBrlRate : 1);
    const toRate =
      this.cachedRates[to] ??
      (to === 'USD' ? 1 : to === 'BRL' ? this.defaultUsdToBrlRate : 1);

    if (fromRate <= 0) return 1;

    // Convert through base (USD)
    return toRate / fromRate;
  }

  /**
   * Convert an amount in minor units (e.g. cents / centavos) from one currency to another.
   * Returns rounded minor units.
   */
  async convertMinor(
    amountMinor: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (!amountMinor || amountMinor <= 0) return 0;
    const from = (fromCurrency || '').toUpperCase();
    const to = (toCurrency || '').toUpperCase();
    if (from === to) return Math.round(amountMinor);

    const rate = await this.getExchangeRate(from, to);
    const converted = Math.round(amountMinor * rate);
    this.logger.log(
      `[CurrencyConverter] Converted ${amountMinor} minor from ${from} to ${to} (rate: ${rate.toFixed(4)}) -> ${converted} minor`,
    );
    return converted;
  }

  /**
   * Convert an amount in major units (e.g. dollars / reais).
   */
  async convertMajor(
    amountMajor: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    if (!amountMajor || amountMajor <= 0) return 0;
    const from = (fromCurrency || '').toUpperCase();
    const to = (toCurrency || '').toUpperCase();
    if (from === to) return amountMajor;

    const rate = await this.getExchangeRate(from, to);
    const converted = Math.round(amountMajor * rate * 100) / 100;
    return converted;
  }

  private async refreshRatesIfNeeded(): Promise<void> {
    const now = Date.now();
    if (
      Object.keys(this.cachedRates).length > 0 &&
      now - this.lastFetchedAt < this.CACHE_TTL_MS
    ) {
      return;
    }

    try {
      const response = await axios.get('https://open.er-api.com/v6/latest/USD', {
        timeout: 4000,
      });
      if (response?.data?.rates && typeof response.data.rates === 'object') {
        this.cachedRates = {
          USD: 1,
          ...response.data.rates,
        };
        this.lastFetchedAt = now;
        this.logger.log(
          `[CurrencyConverter] Successfully refreshed rates from live API. USD->BRL = ${this.cachedRates['BRL']}`,
        );
        return;
      }
    } catch (err: any) {
      this.logger.warn(
        `[CurrencyConverter] Live FX rate API unavailable: ${err?.message || err}. Using fallback USD->BRL rate: ${this.defaultUsdToBrlRate}`,
      );
    }

    // Fallback if API fails
    this.cachedRates = {
      USD: 1,
      BRL: this.defaultUsdToBrlRate,
    };
    this.lastFetchedAt = now;
  }
}
