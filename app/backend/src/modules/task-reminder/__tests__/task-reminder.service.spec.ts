import { TaskReminderService } from '../task-reminder.service';
import { NodeStatus } from '../../node/node.entity';

const reminder = (over: Record<string, unknown> = {}, node: Record<string, unknown> = {}) => ({
  id: 1,
  reminderDate: new Date('2026-01-01T10:00:00Z'),
  createdBy: 5,
  sentAt: null,
  node: { id: 20, title: 'Pay rent', status: NodeStatus.OPEN, isArchived: false, createdBy: 8, ...node },
  ...over,
});

function build(due: any[], claimResults: number[] = []) {
  const repo: any = {
    find: jest.fn(async () => due),
    update: jest.fn(async () => ({ affected: claimResults.shift() ?? 1 })),
  };
  const notifications: any = { notify: jest.fn(async () => undefined) };
  const assignees: any = { findByTask: jest.fn(async () => [{ user: { id: 9 } }, { user: { id: 10 } }]) };
  return { svc: new TaskReminderService(repo, notifications, assignees), repo, notifications, assignees };
}

describe('TaskReminderService.sendDue', () => {
  it('queries only unsent reminders that are due', async () => {
    const { svc, repo } = build([]);
    const now = new Date('2026-01-01T10:05:00Z');
    await svc.sendDue(now);
    const where = repo.find.mock.calls[0][0].where;
    expect(where.sentAt).toBeDefined();
    expect(where.reminderDate.value).toEqual(now);
  });

  it('notifies the person who set the reminder and marks it sent', async () => {
    const { svc, repo, notifications } = build([reminder()]);
    expect(await svc.sendDue()).toBe(1);
    expect(repo.update).toHaveBeenCalledWith({ id: 1, sentAt: expect.anything() }, { sentAt: expect.any(Date) });
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'task_reminder', recipients: [5], actorId: null, nodeId: 20, title: 'Pay rent' }),
    );
  });

  it('falls back to the task creator and assignees when the reminder has no owner', async () => {
    const { svc, notifications } = build([reminder({ createdBy: null })]);
    await svc.sendDue();
    expect(notifications.notify.mock.calls[0][0].recipients).toEqual([8, 9, 10]);
  });

  it('does nothing for a reminder another run already claimed', async () => {
    const { svc, notifications } = build([reminder()], [0]);
    expect(await svc.sendDue()).toBe(0);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('marks but does not announce reminders for finished or archived tasks', async () => {
    const { svc, repo, notifications } = build([
      reminder({ id: 1 }, { status: NodeStatus.DONE }),
      reminder({ id: 2 }, { isArchived: true }),
    ]);
    expect(await svc.sendDue()).toBe(0);
    expect(repo.update).toHaveBeenCalledTimes(2);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('does not run twice at the same time', async () => {
    const { svc, repo } = build([reminder()]);
    const first = svc.sendDue();
    expect(await svc.sendDue()).toBe(0);
    await first;
    expect(repo.find).toHaveBeenCalledTimes(1);
  });
});
