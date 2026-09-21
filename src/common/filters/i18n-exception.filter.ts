import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Request, Response } from 'express';

@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Resolve language from nestjs-i18n attached language or fallback
    const lang =
      (request as any).i18nLang ||
      (request.headers['x-custom-lang'] as string) ||
      (request.headers['x-lang'] as string) ||
      (request.headers['accept-language']?.split(',')[0]?.split('-')[0]) ||
      'en';

    const normalizedLang = ['en', 'pt', 'it', 'es', 'fr'].includes(lang) ? lang : 'en';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: any = 'Internal server error';
    let errorTitle: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        rawMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        rawMessage = (res as any).message || (res as any).error || exception.message;
        errorTitle = (res as any).error;
      }
    } else if (exception?.message) {
      rawMessage = exception.message;
    }

    // Handle array of validation messages (e.g. from class-validator)
    let translatedMessage: any;
    if (Array.isArray(rawMessage)) {
      translatedMessage = rawMessage.map((msg) => this.translateMessage(msg, normalizedLang));
    } else if (typeof rawMessage === 'string') {
      translatedMessage = this.translateMessage(rawMessage, normalizedLang);
    } else {
      translatedMessage = rawMessage;
    }

    response.status(status).json({
      statusCode: status,
      success: false,
      message: translatedMessage,
      ...(errorTitle ? { error: errorTitle } : {}),
    });
  }

  private translateMessage(message: string, lang: string): string {
    if (!message || typeof message !== 'string') return message;

    // 1. Check if message is a direct i18n key (e.g. 'errors.USER_NOT_FOUND', 'common.FAILED')
    if (message.includes('.') && (message.startsWith('errors.') || message.startsWith('common.') || message.startsWith('messages.'))) {
      try {
        const translated = this.i18n.t(message, { lang });
        if (translated && translated !== message) return translated as string;
      } catch {
        // Fall through
      }
    }

    // 2. Lookup in errors dictionary by key or text match
    try {
      // Try direct error translation key
      const directKey = `errors.${message.replace(/\s+/g, '_').toUpperCase()}`;
      const translated = this.i18n.t(directKey, { lang });
      if (translated && translated !== directKey) return translated as string;
    } catch {
      // Fall through
    }

    // 3. Fallback: Check messages & common
    try {
      const commonKey = `common.${message.replace(/\s+/g, '_').toUpperCase()}`;
      const translated = this.i18n.t(commonKey, { lang });
      if (translated && translated !== commonKey) return translated as string;
    } catch {
      // Fall through
    }

    return message;
  }
}
