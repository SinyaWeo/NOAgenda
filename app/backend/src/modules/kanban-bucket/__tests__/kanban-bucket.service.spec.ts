import { asMock, invalid } from '../../../common/__tests__/test-utils';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KanbanBucketService } from '../kanban-bucket.service';
import { CreateBucketDto, UpdateBucketDto } from '../dto/kanban-bucket.dto';
import { NodeStatus } from '../../node/node.entity';

type RepoMock = Record<'find' | 'findOne' | 'create' | 'save' | 'update' | 'delete' | 'count', jest.Mock> & {
  manager: { createQueryBuilder: jest.Mock };
};

describe('KanbanBucketService', () => {
  let repo: RepoMock;
  let qb: Record<'update' | 'set' | 'where' | 'execute', jest.Mock>;
  let service: KanbanBucketService;

  beforeEach(() => {
    qb = { update: jest.fn(), set: jest.fn(), where: jest.fn(), execute: jest.fn(async () => undefined) };
    qb.update.mockReturnValue(qb);
    qb.set.mockReturnValue(qb);
    qb.where.mockReturnValue(qb);
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(async () => 2),
      manager: { createQueryBuilder: jest.fn(() => qb) },
    };
    service = new KanbanBucketService(asMock(repo));
  });

  it('findAll scopes by project and orders by position', async () => {
    await service.findAll(3);
    expect(repo.find).toHaveBeenCalledWith({ where: { projectId: 3 }, order: { position: 'ASC', id: 'ASC' } });
  });

  it('findOne scopes by id and project', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await service.findOne(1, 3);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, projectId: 3 } });
  });

  it('findOne throws 404 when the bucket belongs to another project', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(1, 3)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create strips mass-assigned id/projectId and uses the URL project', async () => {
    await service.create(3, invalid<CreateBucketDto>({ id: 99, projectId: 100, title: 'Todo', position: 2 }));
    expect(repo.create).toHaveBeenCalledWith({ title: 'Todo', position: 2, projectId: 3 });
  });

  it('create appends after the last bucket when no position is given', async () => {
    repo.findOne.mockResolvedValue({ id: 5, position: 4 });
    await service.create(3, { title: 'Todo', status: NodeStatus.OPEN });
    expect(repo.create).toHaveBeenCalledWith({ title: 'Todo', status: NodeStatus.OPEN, position: 5, projectId: 3 });
  });

  it('update checks scope first and never writes identity fields', async () => {
    repo.findOne.mockResolvedValue({ id: 1, projectId: 3, status: NodeStatus.OPEN });
    await service.update(
      1,
      3,
      invalid<UpdateBucketDto>({ id: 5, projectId: 9, createdAt: 1, updatedAt: 2, title: 'X' }),
    );
    expect(repo.update).toHaveBeenCalledWith(1, { title: 'X' });
    expect(qb.execute).not.toHaveBeenCalled();
  });

  it('update does not write when the bucket is out of scope', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update(1, 3, { title: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('changing the status releases tasks whose status no longer matches', async () => {
    repo.findOne.mockResolvedValue({ id: 1, projectId: 3, status: NodeStatus.OPEN });
    await service.update(1, 3, { status: NodeStatus.DONE });
    expect(repo.update).toHaveBeenCalledWith(1, { status: NodeStatus.DONE });
    expect(qb.set).toHaveBeenCalledWith({ bucketId: null });
    expect(qb.where).toHaveBeenCalledWith(expect.any(String), { id: 1, status: NodeStatus.DONE });
  });

  it('refuses to change the status of the last bucket of a status', async () => {
    repo.findOne.mockResolvedValue({ id: 1, projectId: 3, status: NodeStatus.OPEN });
    repo.count.mockResolvedValue(1);
    await expect(service.update(1, 3, { status: NodeStatus.DONE })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.count).toHaveBeenCalledWith({ where: { projectId: 3, status: NodeStatus.OPEN } });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('remove deletes only after scope check', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.remove(1, 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
    repo.findOne.mockResolvedValueOnce({ id: 1, projectId: 3, status: NodeStatus.OPEN });
    await service.remove(1, 3);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });

  it('refuses to remove the last bucket of a status', async () => {
    repo.findOne.mockResolvedValue({ id: 1, projectId: 3, status: NodeStatus.DONE });
    repo.count.mockResolvedValue(1);
    await expect(service.remove(1, 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
