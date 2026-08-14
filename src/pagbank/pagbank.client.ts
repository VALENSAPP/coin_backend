import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import * as fs from 'fs';

@Injectable()
export class PagBankClient {
    private readonly logger = new Logger(PagBankClient.name);

    getApiBaseUrl(): string {
        const env = (process.env.PAGBANK_ENV || 'sandbox').toLowerCase();
        return (
            process.env.PAGBANK_API_BASE_URL ||
            (env === 'production'
                ? 'https://api.pagseguro.com'
                : 'https://sandbox.api.pagseguro.com')
        );
    }

    getSecureApiBaseUrl(): string {
        const env = (process.env.PAGBANK_ENV || 'sandbox').toLowerCase();
        return (
            process.env.PAGBANK_SECURE_API_BASE_URL ||
            (env === 'production'
                ? 'https://secure.api.pagseguro.com'
                : 'https://secure.sandbox.api.pagseguro.com')
        );
    }

    getPlatformToken(): string {
        const token = process.env.PAGBANK_TOKEN || process.env.PAGBANK_ACCOUNT_TOKEN || '';
        if (!token) {
            throw new BadRequestException(
                'PagBank platform token missing. Set PAGBANK_TOKEN in .env',
            );
        }
        return token;
    }

    private buildHttpsAgent(): https.Agent | undefined {
        const certPath = process.env.PAGBANK_MTLS_CERT_PATH;
        const keyPath = process.env.PAGBANK_MTLS_KEY_PATH;
        if (!certPath || !keyPath) return undefined;
        try {
            return new https.Agent({
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath),
                ...(process.env.PAGBANK_MTLS_CA_PATH
                    ? { ca: fs.readFileSync(process.env.PAGBANK_MTLS_CA_PATH) }
                    : {}),
            });
        } catch (error: any) {
            this.logger.error(`Failed to load PagBank mTLS certs: ${error?.message || error}`);
            throw new BadRequestException('Invalid PagBank mTLS certificate configuration');
        }
    }

    createApi(accessToken?: string): AxiosInstance {
        return axios.create({
            baseURL: this.getApiBaseUrl(),
            headers: {
                Authorization: `Bearer ${accessToken || this.getPlatformToken()}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 30000,
        });
    }

    createSecureApi(accessToken?: string): AxiosInstance {
        const httpsAgent = this.buildHttpsAgent();
        return axios.create({
            baseURL: this.getSecureApiBaseUrl(),
            headers: {
                Authorization: `Bearer ${accessToken || this.getPlatformToken()}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: 30000,
            ...(httpsAgent ? { httpsAgent } : {}),
        });
    }

    async post<T = any>(path: string, body: unknown, accessToken?: string): Promise<T> {
        try {
            const { data } = await this.createApi(accessToken).post(path, body);
            return data as T;
        } catch (error: any) {
            this.logAxiosError('POST', path, error);
            throw this.toHttpException(error);
        }
    }

    async get<T = any>(path: string, accessToken?: string): Promise<T> {
        try {
            const { data } = await this.createApi(accessToken).get(path);
            return data as T;
        } catch (error: any) {
            this.logAxiosError('GET', path, error);
            throw this.toHttpException(error);
        }
    }

    async postSecure<T = any>(path: string, body: unknown, accessToken?: string): Promise<T> {
        try {
            const { data } = await this.createSecureApi(accessToken).post(path, body);
            return data as T;
        } catch (error: any) {
            this.logAxiosError('POST(secure)', path, error);
            throw this.toHttpException(error);
        }
    }

    private logAxiosError(method: string, path: string, error: any) {
        this.logger.error(
            `PagBank ${method} ${path} failed: ${error?.response?.status || ''} ${JSON.stringify(error?.response?.data || error?.message)}`,
        );
    }

    private toHttpException(error: any): BadRequestException {
        const message =
            error?.response?.data?.error_messages?.[0]?.description ||
            error?.response?.data?.message ||
            error?.message ||
            'PagBank API request failed';
        return new BadRequestException(message);
    }
}
