import { BadRequestException, PipeTransform, ArgumentMetadata, Injectable } from '@nestjs/common';

/**
 * Global guard for `@Param('id') id: number` style parameters. Without it `transform: true`
 * turns "abc" into NaN, which then reaches the database and comes back as a 500.
 * Runs before ValidationPipe, while the value is still the raw string.
 */
@Injectable()
export class NumericParamPipe implements PipeTransform {
  transform(value: unknown, meta: ArgumentMetadata) {
    if (meta.type === 'param' && meta.metatype === Number) {
      if (typeof value !== 'string' || !/^\d{1,15}$/.test(value)) {
        throw new BadRequestException(`${meta.data ?? 'id'} must be a positive integer`);
      }
    }
    return value;
  }
}
