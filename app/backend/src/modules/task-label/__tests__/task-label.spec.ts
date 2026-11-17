import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskLabelController } from '../task-label.controller';
import { TaskLabelService } from '../task-label.service';

const req = { user: { userId: 2 } };

describe('TaskLabelController', () => {
  let service: any;
  let tasks: any;
  let access: any;
  let labels: any;
  let controller: TaskLabelController;

  beforeEach(() => {
    service = {
      findByTask: jest.fn(async () => [{ id: 1 }]),
      add: jest.fn(async () => ({ id: 9 })),
      remove: jest.fn(),
    };
    tasks = { findById: jest.fn(async () => ({ id: 7 })) };
    access = { assertRead: jest.fn(), assertWrite: jest.fn() };
    labels = { findById: jest.fn(async () => ({ id: 4, createdBy: 2 })) };
    controller = new TaskLabelController(service, tasks, access, labels);
  });

  it('findAll asserts read and returns labels', async () => {
    await expect(controller.findAll(7, req)).resolves.toEqual([{ id: 1 }]);
    expect(access.assertRead).toHaveBeenCalledWith(2, 7);
  });

  it('findAll 404 on missing task', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.findAll(7, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('add attaches the caller own label after assertWrite', async () => {
    await expect(controller.add(7, { labelId: 4 }, req)).resolves.toEqual({ id: 9 });
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(service.add).toHaveBeenCalledWith(7, 4);
  });

  it("add returns 404 for another user's label", async () => {
    labels.findById.mockResolvedValue({ id: 4, createdBy: 99 });
    await expect(controller.add(7, { labelId: 4 }, req)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.add).not.toHaveBeenCalled();
  });

  it('add returns 404 for a nonexistent label', async () => {
    labels.findById.mockResolvedValue(null);
    await expect(controller.add(7, { labelId: 4 }, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('add does not look up labels when write is denied', async () => {
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(controller.add(7, { labelId: 4 }, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(labels.findById).not.toHaveBeenCalled();
  });

  it('add 404 on missing task', async () => {
    tasks.findById.mockResolvedValue(null);
    await expect(controller.add(7, { labelId: 4 }, req)).rejects.toBeInstanceOf(NotFoundException);
    expect(access.assertWrite).not.toHaveBeenCalled();
  });

  it('remove asserts write and delegates', async () => {
    await controller.remove(7, 4, req);
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(service.remove).toHaveBeenCalledWith(7, 4);
  });

  it('remove is blocked when write is denied', async () => {
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(controller.remove(7, 4, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.remove).not.toHaveBeenCalled();
  });
});

describe('TaskLabelService', () => {
  it('findByTask, add and remove use node/label ids', async () => {
    const repo: any = {
      find: jest.fn(async () => []),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    const svc = new TaskLabelService(repo);
    await svc.findByTask(7);
    expect(repo.find).toHaveBeenCalledWith({ where: { node: { id: 7 } }, relations: { label: true, node: true } });
    await svc.add(7, 4);
    expect(repo.create).toHaveBeenCalledWith({ node: { id: 7 }, label: { id: 4 } });
    await svc.remove(7, 4);
    expect(repo.delete).toHaveBeenCalledWith({ node: { id: 7 }, label: { id: 4 } });
  });
});
