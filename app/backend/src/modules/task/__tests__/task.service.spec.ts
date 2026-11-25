import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../task.service';
import { NodeService } from '../../node/node.service';
import { NodeType } from '../../node/node.entity';

describe('TaskService', () => {
  let service: TaskService;
  let nodes: { findAll: jest.Mock; findById: jest.Mock; projectIdsOf: jest.Mock; userTimeZone: jest.Mock };

  beforeEach(async () => {
    nodes = {
      findAll: jest.fn(async () => [
        { id: 1, type: NodeType.TASK, parentId: 10 },
        { id: 2, type: NodeType.TASK, parentId: 1 },
        { id: 3, type: NodeType.TASK, parentId: null },
      ]),
      findById: jest.fn(),
      projectIdsOf: jest.fn(
        async () =>
          new Map([
            [1, 10],
            [2, 10],
          ]),
      ),
      userTimeZone: jest.fn(async () => 'UTC'),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskService, { provide: NodeService, useValue: nodes }],
    }).compile();
    service = module.get<TaskService>(TaskService);
  });

  it('lists each task with its project, also for subtasks; personal tasks get null', async () => {
    const tasks = await service.findAll({ userId: 7 });
    expect(nodes.projectIdsOf).toHaveBeenCalledWith([1, 2, 3]);
    expect(tasks.map((t) => [t.id, t.projectId])).toEqual([
      [1, 10],
      [2, 10],
      [3, null],
    ]);
  });
});
