import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const msg = (body as Record<string, unknown>).message;
        message = Array.isArray(msg)
          ? msg.join('; ')
          : typeof msg === 'string'
          ? msg
          : exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = status >= 500 ? 'Internal server error' : exception.message;
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${exception.message}`,
        exception.stack,
      );
    } else {
      message = 'An unexpected error occurred';
      this.logger.error(`${request.method} ${request.url} → unhandled: ${String(exception)}`);
    }

    if (status < 500) {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    response.status(status).json({
      success: false,
      message,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
