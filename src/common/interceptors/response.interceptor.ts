import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiResponse } from '../dto/response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        statusCode: HttpStatus.OK,
        success: true,
        data,
      })),
      catchError((err) => {
        return throwError(() => ({
          statusCode: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
          success: false,
          message: err.message || 'Internal server error',
        }));
      })
    );
  }
} 