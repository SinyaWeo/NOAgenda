import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { orConflict } from '../db-errors';

const dbError = (code: string) =>
  Object.assign(new QueryFailedError('INSERT', [], new Error(code)), { driverError: { code } });

describe('orConflict', () => {
  it('passes the result through', async () => {
    await expect(orConflict(Promise.resolve(42), 'exists')).resolves.toBe(42);
  });

  it('turns a duplicate key into 409 with the given message', async () => {
    const err = await orConflict(Promise.reject(dbError('ER_DUP_ENTRY')), 'Already there').catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.message).toBe('Already there');
  });

  it.each(['ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW'])(
    'turns a missing reference (%s) into 400',
    async (code) => {
      await expect(orConflict(Promise.reject(dbError(code)), 'x')).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rethrows every other error unchanged', async () => {
    const other = dbError('ER_LOCK_DEADLOCK');
    await expect(orConflict(Promise.reject(other), 'x')).rejects.toBe(other);
    const plain = new Error('boom');
    await expect(orConflict(Promise.reject(plain), 'x')).rejects.toBe(plain);
  });
});
