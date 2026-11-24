import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NoteService } from '../note.service';
import { Note } from '../note.entity';
import { TaskAssignee } from '../../task-assignee/task-assignee.entity';
import { TaskService } from '../../task/task.service';
import { ProjectService } from '../../project/project.service';
import { IdeaService } from '../../idea/idea.service';
import { asMock, type Mocks } from '../../../common/__tests__/test-utils';

describe('NoteService', () => {
  let repo: Mocks;
  let assignees: Mocks;
  let tasks: Mocks;
  let projects: Mocks;
  let ideas: Mocks;
  let service: NoteService;

  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    assignees = { create: jest.fn((x) => x), save: jest.fn() };
    tasks = { create: jest.fn(async () => ({ id: 11 })) };
    projects = { create: jest.fn(async () => ({ id: 12 })) };
    ideas = { create: jest.fn(async () => ({ id: 13 })) };
    service = new NoteService(
      asMock<Repository<Note>>(repo),
      asMock<Repository<TaskAssignee>>(assignees),
      asMock<TaskService>(tasks),
      asMock<ProjectService>(projects),
      asMock<IdeaService>(ideas),
    );
  });

  it('findAll is scoped to the user; open notes first, then completed (latest first)', async () => {
    const d = (n: number): Date => new Date(n);
    repo.find.mockResolvedValue([
      { id: 1, done: true, doneAt: d(1), position: 1 },
      { id: 2, done: false, doneAt: null, position: 2 },
      { id: 3, done: true, doneAt: d(5), position: 3 },
      { id: 4, done: false, doneAt: null, position: 1 },
    ]);
    const out = await service.findAll(7);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(out.map((n) => n.id)).toEqual([4, 2, 3, 1]);
  });

  it('create forces ownership and appends at the end', async () => {
    repo.findOne.mockResolvedValue({ position: 4 });
    await service.create(7, { text: 'Buy milk' });
    expect(repo.create).toHaveBeenCalledWith({ text: 'Buy milk', userId: 7, done: false, doneAt: null, position: 5 });
  });

  it('another user gets 404 on update, remove and convert', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update(1, 8, { done: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(1, 8)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.convert(1, 8, { to: 'task' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 8 } });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('update stamps and clears doneAt', async () => {
    repo.findOne.mockResolvedValue({ id: 1, text: 'a', done: false, doneAt: null });
    const done = await service.update(1, 7, { done: true });
    expect(done.done).toBe(true);
    expect(done.doneAt).toBeInstanceOf(Date);
    repo.findOne.mockResolvedValue({ id: 1, text: 'a', done: true, doneAt: new Date() });
    const open = await service.update(1, 7, { done: false });
    expect(open.doneAt).toBeNull();
  });

  it('removeCompleted deletes only the callers done notes', async () => {
    await service.removeCompleted(7);
    expect(repo.delete).toHaveBeenCalledWith({ userId: 7, done: true });
  });

  it.each([
    ['task', 11],
    ['project', 12],
    ['idea', 13],
  ] as const)('convert to %s creates it and deletes the note', async (to, id) => {
    repo.findOne.mockResolvedValue({ id: 5, userId: 7, text: 'Call Bob' });
    await expect(service.convert(5, 7, { to })).resolves.toEqual({ type: to, id });
    expect(repo.delete).toHaveBeenCalledWith({ id: 5, userId: 7 });
  });

  it('convert to task assigns the creator; the note stays when creation fails', async () => {
    repo.findOne.mockResolvedValue({ id: 5, userId: 7, text: 'Call Bob' });
    await service.convert(5, 7, { to: 'task' });
    expect(tasks.create).toHaveBeenCalledWith({ title: 'Call Bob', createdBy: 7 }, 7);
    expect(assignees.save).toHaveBeenCalledWith({ node: { id: 11 }, user: { id: 7 } });

    repo.delete.mockClear();
    tasks.create.mockRejectedValue(new Error('boom'));
    await expect(service.convert(5, 7, { to: 'task' })).rejects.toThrow('boom');
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
