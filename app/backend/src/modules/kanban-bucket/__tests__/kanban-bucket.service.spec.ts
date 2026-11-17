import { NotFoundException } from '@nestjs/common';
import { KanbanBucketService } from '../kanban-bucket.service';

describe('KanbanBucketService', () => {
  let repo: any;
  let service: KanbanBucketService;

  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      update: jest.fn(),
      delete: jest.fn(),
      manager: { query: jest.fn(async () => [{ 1: 1 }]) }, // the view belongs to the project
    };
    service = new KanbanBucketService(repo);
  });

  it('findAll scopes by project and view and orders by position', async () => {
    await service.findAll(3, 4);
    expect(repo.find).toHaveBeenCalledWith({ where: { projectId: 3, viewId: 4 }, order: { position: 'ASC' } });
  });

  it('findOne scopes by id, project and view', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await service.findOne(1, 3, 4);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, projectId: 3, viewId: 4 } });
  });

  it('findOne throws 404 when the bucket belongs to another project/view', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(1, 3, 4)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create strips mass-assigned id/projectId/viewId and uses the URL values', async () => {
    await service.create(3, 4, { id: 99, projectId: 100, viewId: 200, title: 'Todo' } as any);
    expect(repo.create).toHaveBeenCalledWith({ title: 'Todo', projectId: 3, viewId: 4 });
  });

  it('create refuses a view that belongs to another project, and writes nothing', async () => {
    repo.manager.query.mockResolvedValue([]);
    await expect(service.create(3, 4, { title: 'Todo' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.manager.query).toHaveBeenCalledWith(expect.stringContaining('project_views'), [4, 3]);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('create tolerates undefined data', async () => {
    await service.create(3, 4, undefined as any);
    expect(repo.create).toHaveBeenCalledWith({ projectId: 3, viewId: 4 });
  });

  it('update checks scope first and never writes identity fields', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await service.update(1, 3, 4, { id: 5, projectId: 9, viewId: 9, createdAt: 1, updatedAt: 2, title: 'X' } as any);
    expect(repo.update).toHaveBeenCalledWith(1, { title: 'X' });
  });

  it('update does not write when the bucket is out of scope', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update(1, 3, 4, { title: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('remove deletes only after scope check', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.remove(1, 3, 4)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
    repo.findOne.mockResolvedValueOnce({ id: 1 });
    await service.remove(1, 3, 4);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });
});
