import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/**
 * Run a write and turn the two database errors a client can cause into proper answers instead of a 500:
 * a duplicate key (it already exists -> 409) and a reference to a row that does not exist (-> 400).
 * Anything else is rethrown unchanged.
 */
export async function orConflict<T>(write: Promise<T>, duplicateMessage: string): Promise<T> {
  try {
    return await write;
  } catch (err) {
    if (err instanceof QueryFailedError) {
      const code = err.driverError?.code;
      if (code === 'ER_DUP_ENTRY') throw new ConflictException(duplicateMessage);
      if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_NO_REFERENCED_ROW') {
        throw new BadRequestException('A referenced item does not exist');
      }
    }
    throw err;
  }
}
