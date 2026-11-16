import { BadRequestException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from '../all-exceptions.filter';

function run(exception: unknown) {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host: any = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ method: 'POST', url: '/x' }) }),
  };
  new AllExceptionsFilter().catch(exception, host);
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}
const dbError = (code: string) =>
  new QueryFailedError('SELECT 1', [], Object.assign(new Error('driver says: secret SQL details'), { code }) as any);

describe('AllExceptionsFilter', () => {
  it('passes HTTP exceptions through unchanged', () => {
    const { status, body } = run(new BadRequestException('nope'));
    expect(status).toBe(400);
    expect(body).toMatchObject({ message: 'nope' });
  });

  it.each([
    ['ER_DUP_ENTRY', 409],
    ['ER_NO_REFERENCED_ROW_2', 400],
    ['ER_ROW_IS_REFERENCED_2', 409],
    ['ER_DATA_TOO_LONG', 400],
    ['ER_NO_DEFAULT_FOR_FIELD', 400],
  ])('maps database error %s to %i without leaking driver text', (code, expected) => {
    const { status, body } = run(dbError(code));
    expect(status).toBe(expected);
    expect(JSON.stringify(body)).not.toMatch(/SQL|driver says/);
  });

  it('answers a generic 500 for unknown errors, with no message or stack leaked', () => {
    const { status, body } = run(new Error('connection string postgres://user:pass@host'));
    expect(status).toBe(500);
    expect(body).toEqual({ statusCode: 500, message: 'Internal server error' });
  });

  it('keeps 4xx statuses from the HTTP layer (e.g. body too large)', () => {
    const { status, body } = run(Object.assign(new Error('request entity too large'), { status: 413, expose: true }));
    expect(status).toBe(413);
    expect(body.message).toMatch(/too large/);
  });

  it('does not expose messages of non-exposed 4xx errors', () => {
    const { body } = run(Object.assign(new Error('internal detail'), { status: 400, expose: false }));
    expect(body.message).toBe('Bad request');
  });

  it('exports the status enum used above', () => {
    expect(HttpStatus.CONFLICT).toBe(409);
  });
});
