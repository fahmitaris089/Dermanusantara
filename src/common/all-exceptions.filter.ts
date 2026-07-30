import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainException } from './domain.exception';
import { Prisma } from '@prisma/client';

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
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        code = 'RESOURCE_CONFLICT';
        message = 'Data dengan nilai unik tersebut sudah tersedia.';
      } else if (exception.code === 'P2025') {
        code = 'NOT_FOUND';
        message = 'Data tidak ditemukan.';
      }
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
