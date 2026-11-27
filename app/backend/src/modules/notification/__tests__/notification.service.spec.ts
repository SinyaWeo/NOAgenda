import { Mocks } from '../../../common/__tests__/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../notification.entity';
import { UserService } from '../../user/user.service';
import { Translator } from '../../../i18n/translator.service';
import { realTranslator } from '../../../i18n/__tests__/fake-i18n';

describe('NotificationService', () => {
  let service: NotificationService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: UserService,
          useValue: {
            languagesOf: jest.fn(async (ids: number[]) => new Map(ids.map((i) => [i, i === 3 ? 'cs' : 'en']))),
          },
        },
        { provide: Translator, useValue: realTranslator() },
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((x) => x),
            save: jest.fn(async (x: object[]) => x.map((n, i) => ({ id: 100 + i, ...n }))),
          },
        },
      ],
    }).compile();
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notify', () => {
    const event = {
      type: 'task_assigned' as const,
      actorId: 1,
      actorName: 'ann',
      nodeId: 9,
      kind: 'task' as const,
      title: 'Write docs',
    };
    const repo = () => module.get(getRepositoryToken(Notification)) as Mocks;

    it('creates one notification per recipient, without duplicates, the actor or empty ids', async () => {
      await service.notify({ ...event, recipients: [2, 2, 3, 1, null, undefined] });
      const saved = repo().save.mock.calls[0][0];
      expect(saved.map((n: { user: { id: number } }) => n.user.id)).toEqual([2, 3]);
      expect(saved[0]).toMatchObject({
        type: 'task_assigned',
        nodeId: 9,
        message: 'ann assigned you to "Write docs"',
      });
      expect(JSON.parse(saved[0].params)).toEqual({ actor: 'ann', title: 'Write docs', kind: 'task' });
    });

    it("writes each notification's message in that recipient's own language", async () => {
      await service.notify({ ...event, recipients: [2, 3] });
      const [en, cs] = repo().save.mock.calls[0][0];
      expect(en.message).toBe('ann assigned you to "Write docs"');
      expect(cs.message).toBe('ann vás přiřadil(a) k úkolu „Write docs“');
    });

    it('words a system reminder without an actor and keeps the owner as recipient', async () => {
      await service.notify({
        type: 'task_reminder',
        actorId: null,
        nodeId: 9,
        kind: 'task',
        title: 'Pay rent',
        recipients: [4],
      });
      const saved = repo().save.mock.calls[0][0];
      expect(saved[0]).toMatchObject({ type: 'task_reminder', message: 'Reminder: "Pay rent"' });
      expect(saved.map((n: { user: { id: number } }) => n.user.id)).toEqual([4]);
    });

    it('does nothing when nobody is left to notify', async () => {
      await service.notify({ ...event, recipients: [1, null] });
      expect(repo().save).not.toHaveBeenCalled();
    });

    it('never throws when saving fails', async () => {
      repo().save.mockRejectedValueOnce(new Error('db down'));
      await expect(service.notify({ ...event, recipients: [2] })).resolves.toBeUndefined();
    });

    it("tells listeners (notification channels) what was stored, in each recipient's language", async () => {
      const seen: unknown[] = [];
      service.onCreated((c) => seen.push(...c));
      service.onCreated(() => {
        throw new Error('a broken listener does not stop the others or the action');
      });
      await service.notify({ ...event, recipients: [2, 3] });
      expect(seen).toEqual([
        {
          id: 100,
          userId: 2,
          type: 'task_assigned',
          message: 'ann assigned you to "Write docs"',
          language: 'en',
          nodeId: 9,
          kind: 'task',
        },
        {
          id: 101,
          userId: 3,
          type: 'task_assigned',
          message: 'ann vás přiřadil(a) k úkolu „Write docs“',
          language: 'cs',
          nodeId: 9,
          kind: 'task',
        },
      ]);
    });

    it('keeps the fallback message within the column length', async () => {
      await service.notify({ ...event, title: 'x'.repeat(500), actorName: 'y'.repeat(500), recipients: [2] });
      expect(repo().save.mock.calls[0][0][0].message.length).toBeLessThanOrEqual(255);
    });
  });
});
