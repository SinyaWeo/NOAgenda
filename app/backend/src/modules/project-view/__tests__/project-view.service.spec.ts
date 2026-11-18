import { ProjectViewService } from '../project-view.service';
import { ProjectView, ViewType } from '../project-view.entity';
import { Repository } from 'typeorm';
import { asMock, type Mocks } from '../../../common/__tests__/test-utils';

describe('ProjectViewService', () => {
  let repo: Mocks;
  let service: ProjectViewService;

  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => ({ id: 1 })),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new ProjectViewService(asMock<Repository<ProjectView>>(repo));
  });

  it('findByProject filters by project and loads the project relation', async () => {
    await service.findByProject(5);
    expect(repo.find).toHaveBeenCalledWith({ where: { project: { id: 5 } }, relations: { project: true } });
  });

  it('create defaults the view type to LIST', async () => {
    await service.create(5, 'Main');
    expect(repo.create).toHaveBeenCalledWith({ project: { id: 5 }, title: 'Main', viewType: ViewType.LIST });
  });

  it('create honours an explicit view type', async () => {
    await service.create(5, 'Board', ViewType.KANBAN);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ viewType: ViewType.KANBAN }));
  });

  it('update writes then re-reads the view', async () => {
    const out = await service.update(1, { title: 'X' });
    expect(repo.update).toHaveBeenCalledWith(1, { title: 'X' });
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: { project: true } });
    expect(out).toEqual({ id: 1 });
  });

  it('remove deletes by id', async () => {
    await service.remove(9);
    expect(repo.delete).toHaveBeenCalledWith(9);
  });
});
