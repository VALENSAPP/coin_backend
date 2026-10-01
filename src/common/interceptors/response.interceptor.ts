import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse } from '../dto/response.dto';
import { I18nService } from 'nestjs-i18n';
import { Request } from 'express';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(@Optional() private readonly i18n?: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const lang =
      (req as any)?.i18nLang ||
      (req?.headers?.['x-custom-lang'] as string) ||
      (req?.headers?.['x-lang'] as string) ||
      (req?.headers?.['accept-language']?.split(',')[0]?.split('-')[0]) ||
      'en';

    const normalizedLang = ['en', 'pt', 'it', 'es', 'fr'].includes(lang) ? lang : 'en';

    return next.handle().pipe(
      map((data) => {
        const localizedData = this.localizePayload(data, normalizedLang);
        return {
          statusCode: HttpStatus.OK,
          success: true,
          data: localizedData,
        };
      }),
      catchError((err) => {
        const rawMsg = err?.message || 'Internal server error';
        const translatedMsg = this.translateText(rawMsg, normalizedLang);
        return throwError(() => ({
          statusCode: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
          success: false,
          message: translatedMsg,
        }));
      }),
    );
  }

  private localizePayload(data: any, lang: string): any {
    if (!data) return data;

    if (typeof data === 'string') {
      return this.translateText(data, lang);
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      const cloned = { ...data };
      if (typeof cloned.message === 'string') {
        cloned.message = this.translateText(cloned.message, lang);
      }
      if (typeof cloned.msg === 'string') {
        cloned.msg = this.translateText(cloned.msg, lang);
      }
      return cloned;
    }

    return data;
  }

  private translateText(text: string, lang: string): string {
    if (!text || !this.i18n) return text;

    // 1. Direct translation key (e.g. 'common.LOGIN_SUCCESS')
    if (
      text.includes('.') &&
      (text.startsWith('common.') ||
        text.startsWith('messages.') ||
        text.startsWith('errors.') ||
        text.startsWith('notifications.'))
    ) {
      try {
        const res = this.i18n.t(text, { lang });
        if (res && res !== text) return res as string;
      } catch {
        // Fall through
      }
    }

    // 2. Normalized key candidate lookup (e.g. "Profile updated" -> "messages.PROFILE_UPDATED")
    const cleanKey = text.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const keyCandidates = [
      `messages.${cleanKey}`,
      `common.${cleanKey}`,
      `errors.${cleanKey}`,
    ];

    for (const key of keyCandidates) {
      try {
        const res = this.i18n.t(key, { lang });
        if (res && res !== key) return res as string;
      } catch {
        // Fall through
      }
    }

    return text;
  }
}