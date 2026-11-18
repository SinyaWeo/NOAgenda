import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/** MariaDB/MySQL error codes we can explain to the client instead of answering 500. */
const DB_ERRORS: Record<string, { status: number; message: string }> = {
  ER_DUP_ENTRY: { status: HttpStatus.CONFLICT, message: 'An item with the same unique value already exists' },
  ER_NO_REFERENCED_ROW_2: { status: HttpStatus.BAD_REQUEST, message: 'A referenced item does not exist' },
  ER_ROW_IS_REFERENCED_2: { status: HttpStatus.CONFLICT, message: 'This item is still in use and cannot be removed' },
  ER_DATA_TOO_LONG: { status: HttpStatus.BAD_REQUEST, message: 'A value is too long' },
  ER_NO_DEFAULT_FOR_FIELD: { status: HttpStatus.BAD_REQUEST, message: 'A required field is missing' },
  ER_BAD_NULL_ERROR: { status: HttpStatus.BAD_REQUEST, message: 'A required field is missing' },
  ER_TRUNCATED_WRONG_VALUE: { status: HttpStatus.BAD_REQUEST, message: 'A value has an invalid format' },
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: { status: HttpStatus.BAD_REQUEST, message: 'A value has an invalid format' },
  ER_WARN_DATA_OUT_OF_RANGE: { status: HttpStatus.BAD_REQUEST, message: 'A value is out of range' },
};

/**
 * Last line of defence. HTTP errors pass through unchanged; known database errors
 * become 4xx with a safe message; anything else is logged in full on the server and
 * answered with a generic 500 (no stack traces or SQL in the response).
 */
/** Shape of errors raised by the HTTP layer itself (body-parser, multer, ...). */
interface HttpLikeError {
  status?: number;
  statusCode?: number;
  expose?: boolean;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      return res
        .status(exception.getStatus())
        .json(typeof body === 'string' ? { statusCode: exception.getStatus(), message: body } : body);
    }

    if (exception instanceof QueryFailedError) {
      const known = DB_ERRORS[exception.driverError?.code];
      if (known) {
        return res
          .status(known.status)
          .json({ statusCode: known.status, message: known.message, error: HttpStatus[known.status] });
      }
    }

    // Errors from the HTTP layer itself (body too large, malformed JSON, ...) carry a 4xx status.
    const http = (typeof exception === 'object' && exception !== null ? exception : {}) as HttpLikeError;
    const status = http.status ?? http.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      const message = http.expose ? (exception as Error).message : 'Bad request';
      return res.status(status).json({ statusCode: status, message });
    }

    const req = host.switchToHttp().getRequest();
    this.logger.error(
      `${req?.method} ${req?.url} failed: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );
    return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
