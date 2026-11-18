import {
  ArgumentMetadata,
  Type,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Access, NodeAccessService } from '../../node/node-access.service';
import { ProjectViewService } from '../project-view.service';
import { ProjectService } from '../../project/project.service';
import { asMock, authReq, invalid, type Mocks } from '../../../common/__tests__/test-utils';
import { ProjectViewController } from '../project-view.controller';
import { CreateViewDto, UpdateViewDto } from '../dto/project-view.dto';
import { ViewType } from '../project-view.entity';

const req = authReq(7);

describe('ProjectViewController', () => {
  let access: Mocks;
  let service: Mocks;
  let controller: ProjectViewController;

  beforeEach(() => {
    access = { assertProject: jest.fn(async () => undefined) };
    service = {
      findByProject: jest.fn(async () => []),
      findById: jest.fn(async () => ({ id: 2, project: { id: 3 } })),
      create: jest.fn(async () => ({ id: 2 })),
      update: jest.fn(async () => ({ id: 2 })),
      remove: jest.fn(async () => undefined),
    };
    controller = new ProjectViewController(
      asMock<ProjectViewService>(service),
      asMock<ProjectService>({}),
      asMock<NodeAccessService>(access),
    );
  });

  it('reads require READ', async () => {
    await controller.findAll(3, req);
    await controller.findById(3, 2, req);
    expect(access.assertProject).toHaveBeenNthCalledWith(1, 7, 3, Access.READ);
    expect(access.assertProject).toHaveBeenNthCalledWith(2, 7, 3, Access.READ);
  });

  it('writes require ADMIN', async () => {
    await controller.create(3, { title: 'T' }, req);
    await controller.update(3, 2, { title: 'T' }, req);
    await controller.remove(3, 2, req);
    expect(access.assertProject).toHaveBeenCalledTimes(3);
    for (const call of access.assertProject.mock.calls) expect(call).toEqual([7, 3, Access.ADMIN]);
  });

  it('create forwards title and viewType', async () => {
    await controller.create(3, { title: 'T', viewType: ViewType.KANBAN }, req);
    expect(service.create).toHaveBeenCalledWith(3, 'T', ViewType.KANBAN);
  });

  it('findById throws 404 for a missing view', async () => {
    service.findById.mockResolvedValue(null);
    await expect(controller.findById(3, 2, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findById/update/remove answer 404 for a view of another project (its existence is not revealed)', async () => {
    service.findById.mockResolvedValue({ id: 2, project: { id: 99 } });
    await expect(controller.findById(3, 2, req)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.update(3, 2, { title: 'x' }, req)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.remove(3, 2, req)).rejects.toBeInstanceOf(NotFoundException);
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('compares project ids numerically (string route param vs number)', async () => {
    await expect(controller.findById(invalid<number>('3'), 2, req)).resolves.toBeDefined();
  });

  it('update throws 404 when the update returns nothing', async () => {
    service.update.mockResolvedValue(null);
    await expect(controller.update(3, 2, { title: 'x' }, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove and update 404 for a missing view', async () => {
    service.findById.mockResolvedValue(null);
    await expect(controller.remove(3, 2, req)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.update(3, 2, {}, req)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does nothing when access is denied', async () => {
    access.assertProject.mockRejectedValue(new ForbiddenException());
    await expect(controller.remove(3, 2, req)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findById).not.toHaveBeenCalled();
  });
});

describe('view DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = (metatype: Type<unknown>): ArgumentMetadata => ({ type: 'body', metatype });

  it('accepts valid bodies', async () => {
    await expect(pipe.transform({ title: 'A', viewType: 'kanban' }, meta(CreateViewDto))).resolves.toBeDefined();
    await expect(pipe.transform({}, meta(UpdateViewDto))).resolves.toBeDefined();
  });

  it.each([
    {},
    { title: '' },
    { title: 'A', viewType: 'bogus' },
    { title: 'A', project: { id: 2 } },
    { title: 'A', id: 1 },
  ])('rejects invalid create body %j', async (body) => {
    await expect(pipe.transform(body, meta(CreateViewDto))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects mass-assigned project on update', async () => {
    await expect(pipe.transform({ project: { id: 2 } }, meta(UpdateViewDto))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
