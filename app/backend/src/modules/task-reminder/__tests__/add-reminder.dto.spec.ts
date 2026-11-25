import type { ArgumentMetadata } from '@nestjs/common';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AddReminderDto } from '../../task-assignee/dto/task-links.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta: ArgumentMetadata = { type: 'body', metatype: AddReminderDto };

describe('AddReminderDto', () => {
  it.each([
    { reminderDate: '2030-01-01T09:00:00.000Z' },
    { daysBefore: 2, atTime: '09:30' },
    { daysBefore: 0, atTime: '23:59' },
  ])('accepts %j', async (body) => {
    await expect(pipe.transform(body, meta)).resolves.toBeDefined();
  });

  it.each([
    {},
    { reminderDate: 'soon' },
    { daysBefore: 2 },
    { daysBefore: -1, atTime: '09:00' },
    { daysBefore: 400, atTime: '09:00' },
    { daysBefore: 1.5, atTime: '09:00' },
    { daysBefore: 1, atTime: '24:00' },
    { daysBefore: 1, atTime: '9:00' },
  ])('rejects %j', async (body) => {
    await expect(pipe.transform(body, meta)).rejects.toBeInstanceOf(BadRequestException);
  });
});
