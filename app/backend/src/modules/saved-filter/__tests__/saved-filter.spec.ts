import { ArgumentMetadata, BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { SavedFilterController } from '../saved-filter.controller';
import { SavedFilterService } from '../saved-filter.service';
import { CreateFilterDto, UpdateFilterDto } from '../dto/saved-filter.dto';

describe('SavedFilterService', () => {
  let repo: any;
  let service: SavedFilterService;

  beforeEach(() => {
    repo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 1, ...x })),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new SavedFilterService(repo);
  });

  it('findAll returns only the user own filters', async () => {
    await service.findAll(7);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: 7 } });
  });

  it('findOne is scoped to the owner; another user gets 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(1, 8)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, userId: 8 } });
  });

  it('create forces ownership and ignores client-supplied id/userId', async () => {
    await service.create(7, { id: 50, userId: 99, name: 'F' } as any);
    expect(repo.create).toHaveBeenCalledWith({ name: 'F', userId: 7 });
  });

  it('update strips identity/ownership fields', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await service.update(1, 7, { id: 2, userId: 99, createdAt: 1, updatedAt: 2, name: 'N' } as any);
    expect(repo.update).toHaveBeenCalledWith(1, { name: 'N' });
  });

  it('update of someone else filter 404s without writing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.update(1, 8, { name: 'N' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('remove of someone else filter 404s without deleting', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove(1, 8)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('remove deletes the owned filter', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });
    await service.remove(1, 7);
    expect(repo.delete).toHaveBeenCalledWith(1);
  });
});

describe('SavedFilterController', () => {
  it('always passes the authenticated user id, never a client one', async () => {
    const service: any = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const c = new SavedFilterController(service);
    const req = { user: { userId: 7 } };
    c.findAll(req);
    c.findOne(1 as any, req);
    c.create({ name: 'a' }, req);
    c.update(1 as any, { name: 'b' }, req);
    c.remove(1 as any, req);
    expect(service.findAll).toHaveBeenCalledWith(7);
    expect(service.findOne).toHaveBeenCalledWith(1, 7);
    expect(service.create).toHaveBeenCalledWith(7, { name: 'a' });
    expect(service.update).toHaveBeenCalledWith(1, 7, { name: 'b' });
    expect(service.remove).toHaveBeenCalledWith(1, 7);
  });
});

describe('saved filter DTOs', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta = (metatype: any): ArgumentMetadata => ({ type: 'body', metatype });

  it('accepts a full valid filter', async () => {
    const out: any = await pipe.transform(
      {
        name: 'Mine',
        description: 'd',
        filters: { status: 'open', priority: 3, projectId: 2, search: 'x', due: 'week', hideDone: true },
      },
      meta(CreateFilterDto),
    );
    expect(out.filters.due).toBe('week');
  });

  it.each([
    {},
    { name: '' },
    { name: 'a', userId: 5 },
    { name: 'a', filters: { status: 'bogus' } },
    { name: 'a', filters: { priority: 6 } },
    { name: 'a', filters: { priority: -1 } },
    { name: 'a', filters: { projectId: 0 } },
    { name: 'a', filters: { due: 'tomorrow' } },
    { name: 'a', filters: { search: 'x'.repeat(101) } },
    { name: 'a', filters: { hideDone: 'yes' } },
    { name: 'a', filters: { arbitrary: 1 } },
  ])('rejects %j', async (body) => {
    await expect(pipe.transform(body, meta(CreateFilterDto))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update allows partial bodies but rejects empty name and unknown keys', async () => {
    await expect(pipe.transform({ description: 'x' }, meta(UpdateFilterDto))).resolves.toBeDefined();
    await expect(pipe.transform({ name: '' }, meta(UpdateFilterDto))).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ id: 1 }, meta(UpdateFilterDto))).rejects.toBeInstanceOf(BadRequestException);
  });
});
