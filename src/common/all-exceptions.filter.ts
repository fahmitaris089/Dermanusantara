import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainException } from './domain.exception';

type RequestWithId = Request & { requestId?: string };

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = 'INTERNAL_ERROR';
    let message = 'Terjadi kesalahan internal.';
    let details: unknown;

    if (exception instanceof DomainException) {
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      const body = exception.getResponse();
      code = status === HttpStatus.TOO_MANY_REQUESTS ? 'RATE_LIMITED' : 'VALIDATION_ERROR';
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const value = body as { message?: string | string[] };
        message = Array.isArray(value.message)
          ? value.message.join(', ')
          : (value.message ?? exception.message);
        details = body;
      }
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        requestId: request.requestId,
      },
    });
  }
}
