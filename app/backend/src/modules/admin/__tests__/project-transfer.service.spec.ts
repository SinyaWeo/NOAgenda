import { asMock } from '../../../common/__tests__/test-utils';
import type { DomainEvents } from '../../../common/domain-events';
import type { NotificationService } from '../../notification/notification.service';
import { ProjectTransferService } from '../project-transfer.service';

describe('ProjectTransferService', () => {
  it('records an audit-only owner change and notifies the new owner, per project', async () => {
    const events = { emit: jest.fn() };
    const notifications = { notify: jest.fn(async () => undefined) };
    const svc = new ProjectTransferService(asMock<DomainEvents>(events), asMock<NotificationService>(notifications));
    await svc.announce(
      [
        { id: 5, name: 'Home' },
        { id: 6, name: null },
      ],
      { fromName: 'bob', to: { id: 3, username: 'carol' }, actorId: 1, actorName: 'alice' },
    );
    expect(events.emit).toHaveBeenCalledTimes(2);
    expect(events.emit).toHaveBeenCalledWith({
      name: 'project.owner_changed',
      data: { projectId: 5 },
      nodeId: 5,
      projectId: 5,
      owner: 3,
      actorId: 1,
      title: 'Home',
      changes: { owner: { from: 'bob', to: 'carol' } },
      auditOnly: true,
    });
    expect(notifications.notify).toHaveBeenCalledWith({
      type: 'project_transferred',
      recipients: [3],
      actorId: 1,
      actorName: 'alice',
      nodeId: 6,
      kind: 'project',
      title: '',
    });
  });
});
