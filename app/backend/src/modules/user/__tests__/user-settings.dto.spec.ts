import { ArgumentMetadata, Type, BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateGeneralSettingsDto, UpdateEmailDto } from '../dto/user-settings.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const meta = (metatype: Type<unknown>): ArgumentMetadata => ({ type: 'body', metatype });

describe('user settings DTOs', () => {
  it('rejects role escalation through settings/general', async () => {
    await expect(pipe.transform({ role: 'admin' }, meta(UpdateGeneralSettingsDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each(['isEmailConfirmed', 'password', 'deletionScheduledAt', 'id', 'email'])(
    'rejects forbidden field %s',
    async (field) => {
      await expect(pipe.transform({ [field]: 'x' }, meta(UpdateGeneralSettingsDto))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it('accepts the fields the frontend actually sends', async () => {
    const out = await pipe.transform(
      { name: 'Ann', language: 'en', timezone: 'Europe/Prague', theme: 'dark' },
      meta(UpdateGeneralSettingsDto),
    );
    expect(out).toMatchObject({ name: 'Ann', theme: 'dark' });
  });

  it('accepts a default project, null to clear it, and rejects nonsense', async () => {
    await expect(pipe.transform({ defaultProjectId: 4 }, meta(UpdateGeneralSettingsDto))).resolves.toMatchObject({
      defaultProjectId: 4,
    });
    await expect(pipe.transform({ defaultProjectId: null }, meta(UpdateGeneralSettingsDto))).resolves.toMatchObject({
      defaultProjectId: null,
    });
    for (const bad of [0, -1, 1.5, 'x']) {
      await expect(pipe.transform({ defaultProjectId: bad }, meta(UpdateGeneralSettingsDto))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
  });

  it('no longer accepts the removed weekStart setting', async () => {
    await expect(pipe.transform({ weekStart: 1 }, meta(UpdateGeneralSettingsDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid theme and an invalid email', async () => {
    await expect(pipe.transform({ theme: 'neon' }, meta(UpdateGeneralSettingsDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(pipe.transform({ email: 'nope', password: 'x' }, meta(UpdateEmailDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
