import { validate } from 'class-validator';
import { MaxBytes } from '../max-bytes';

class Dto {
  @MaxBytes(72) password!: string;
  constructor(p: string) {
    this.password = p;
  }
}

describe('MaxBytes', () => {
  it('accepts up to 72 bytes and rejects more', async () => {
    expect(await validate(new Dto('a'.repeat(72)))).toHaveLength(0);
    expect(await validate(new Dto('a'.repeat(73)))).toHaveLength(1);
  });
  it('counts bytes, not characters (bcrypt truncates bytes)', async () => {
    expect('ř'.repeat(40)).toHaveLength(40); // 40 characters ...
    expect(await validate(new Dto('ř'.repeat(40)))).toHaveLength(1); // ... but 80 bytes
    expect(await validate(new Dto('ř'.repeat(36)))).toHaveLength(0); // 72 bytes
  });
});
