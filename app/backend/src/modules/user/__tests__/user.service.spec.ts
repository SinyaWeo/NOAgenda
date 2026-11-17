import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user.entity';

describe('UserService', () => {
  let service: UserService;
  let repo: { find: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    repo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assertActive', () => {
    it('passes for an existing unlocked user', async () => {
      repo.findOne.mockResolvedValue({ id: 5, isLocked: false });
      await expect(service.assertActive(5)).resolves.toBeUndefined();
    });

    it.each([null, { id: 5, isLocked: true }])('throws 404 for %j', async (row) => {
      repo.findOne.mockResolvedValue(row);
      await expect(service.assertActive(5)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
