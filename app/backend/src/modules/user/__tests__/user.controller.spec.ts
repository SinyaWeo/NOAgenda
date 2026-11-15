import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../user.controller';
import { UserService } from '../user.service';
import { EmailVerificationService } from '../../email-verification/email-verification.service';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: { findAll: jest.fn(), findById: jest.fn() },
        },
        { provide: EmailVerificationService, useValue: { send: jest.fn() } },
      ],
    }).compile();
    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for controller methods here
});
