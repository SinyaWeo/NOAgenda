import { BadRequestException } from '@nestjs/common';
import { NumericParamPipe } from '../numeric-param.pipe';

const pipe = new NumericParamPipe();
const param = { type: 'param' as const, metatype: Number, data: 'id' };

describe('NumericParamPipe', () => {
  it('lets numeric ids through untouched (ValidationPipe converts them later)', () => {
    expect(pipe.transform('42', param)).toBe('42');
  });

  it.each(['abc', '1.5', '-3', '', '1e3', '99999999999999999999', '0x10'])('rejects %p with a 400', (v) => {
    expect(() => pipe.transform(v, param)).toThrow(BadRequestException);
  });

  it('ignores parameters that are not declared as numbers, and non-param input', () => {
    expect(pipe.transform('abc', { type: 'param', metatype: String, data: 'kind' })).toBe('abc');
    expect(pipe.transform('abc', { type: 'query', metatype: Number, data: 'page' })).toBe('abc');
    expect(pipe.transform({ a: 1 }, { type: 'body', metatype: Object })).toEqual({ a: 1 });
  });
});
