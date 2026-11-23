import { asMock } from '../../../common/__tests__/test-utils';
import { DomainEvent, DomainEvents } from '../../../common/domain-events';
import { NodeRevision } from '../node-revision.entity';
import { MAX_REVISIONS, NodeRevisionService } from '../node-revision.service';

function build(existing = 1) {
  const saved: Partial<NodeRevision>[] = [];
  const repo = {
    create: jest.fn((x: Partial<NodeRevision>) => x),
    save: jest.fn(async (x: Partial<NodeRevision>) => {
      saved.push(x);
      return x;
    }),
    delete: jest.fn(async () => ({ affected: 1 })),
    find: jest.fn(async () => Array.from({ length: existing }, (_, i) => ({ id: 100 - i }))),
    manager: { query: jest.fn(async () => [{ username: 'alice' }]) },
  };
  const svc = new NodeRevisionService(asMock(repo), asMock<DomainEvents>({ on: jest.fn() }));
  return { svc, repo, saved };
}

const ev = (over: Partial<DomainEvent> = {}): DomainEvent => ({
  name: 'task.updated',
  data: { id: 5, title: 'T', description: 'x'.repeat(500) },
  nodeId: 5,
  actorId: 2,
  changes: { description: { from: 'a', to: 'b' } },
  ...over,
});

describe('NodeRevisionService.handle', () => {
  it('keeps the full text when the description changes', async () => {
    const { svc, saved } = build();
    await svc.handle(ev());
    expect(saved[0]).toMatchObject({ nodeId: 5, actorId: 2, actorName: 'alice', title: 'T' });
    expect(saved[0].description).toHaveLength(500);
  });

  it('records creation', async () => {
    const { svc, saved } = build();
    await svc.handle(ev({ name: 'project.created', changes: undefined }));
    expect(saved).toHaveLength(1);
  });

  it('ignores updates that touch neither title nor description', async () => {
    const { svc, saved } = build();
    await svc.handle(ev({ changes: { status: { from: 'a', to: 'b' } } }));
    await svc.handle(ev({ changes: {} }));
    await svc.handle(ev({ name: 'comment.created' }));
    expect(saved).toHaveLength(0);
  });

  it('keeps revisions when a node is deleted (it may be restored)', async () => {
    const { svc, repo, saved } = build();
    await svc.handle(ev({ name: 'task.deleted' }));
    expect(repo.delete).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it('trims beyond the cap', async () => {
    const { svc, repo } = build(MAX_REVISIONS);
    await svc.handle(ev());
    expect(repo.delete).toHaveBeenCalledTimes(1);
  });
});
