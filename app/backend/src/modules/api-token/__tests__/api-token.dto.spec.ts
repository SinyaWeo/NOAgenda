import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApiTokenDto } from '../dto/api-token.dto';

const check = (o: object) => validate(plainToInstance(CreateApiTokenDto, o));

describe('CreateApiTokenDto', () => {
  it('accepts a minimal and a full payload', async () => {
    expect(await check({ name: 'ci' })).toHaveLength(0);
    expect(await check({ name: 'ci', scope: 'write', expiresAt: '2030-01-01T00:00:00Z' })).toHaveLength(0);
  });
  it.each([
    [{}],
    [{ name: '' }],
    [{ name: 'x'.repeat(256) }],
    [{ name: 'a', scope: 'admin' }],
    [{ name: 'a', expiresAt: 'tomorrow' }],
  ])('rejects %j', async (o) => {
    expect((await check(o)).length).toBeGreaterThan(0);
  });
});
