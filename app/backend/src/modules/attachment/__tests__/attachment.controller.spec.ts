import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NodeAccessService } from '../../node/node-access.service';
import { NodeService } from '../../node/node.service';
import { DomainEvents } from '../../../common/domain-events';
import { AttachmentController } from '../attachment.controller';
import { AttachmentService } from '../attachment.service';
import { Attachment } from '../attachment.entity';
import type { AuthRequest } from '../../../common/auth-user';

describe('AttachmentController', () => {
  let controller: AttachmentController;
  let service: AttachmentService;
  let access: NodeAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentController],
      providers: [
        {
          provide: NodeAccessService,
          useValue: {
            assertRead: jest.fn(),
            assertWrite: jest.fn(),
            assertAdmin: jest.fn(),
            assertCanModify: jest.fn(),
            assertCanUseAsParent: jest.fn(),
            sanitize: jest.fn((x) => x),
          },
        },
        { provide: NodeService, useValue: { findById: jest.fn() } },
        { provide: DomainEvents, useValue: { emit: jest.fn() } },
        {
          provide: AttachmentService,
          useValue: { findAll: jest.fn(), findById: jest.fn(), remove: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<AttachmentController>(AttachmentController);
    service = module.get<AttachmentService>(AttachmentService);
    access = module.get<NodeAccessService>(NodeAccessService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('access to an attachment', () => {
    const UPLOADER = 7;
    const OTHER = 8;
    const req = (userId: number) => ({ user: { userId } }) as unknown as AuthRequest;
    const att = (node: { id: number } | null) =>
      ({ id: 1, filename: 'a.txt', path: '/nowhere/a.txt', node, uploader: { id: UPLOADER } }) as unknown as Attachment;
    const denied = () => {
      throw new ForbiddenException();
    };

    it('lets the uploader read their own file without checking the task', async () => {
      jest.mocked(service.findById).mockResolvedValue(att({ id: 3 }));
      jest.mocked(access.assertRead).mockImplementation(denied);
      await expect(controller.findById(1, req(UPLOADER))).resolves.toBeDefined();
    });

    it('refuses others who cannot read the task', async () => {
      jest.mocked(service.findById).mockResolvedValue(att({ id: 3 }));
      jest.mocked(access.assertRead).mockImplementation(denied);
      await expect(controller.findById(1, req(OTHER))).rejects.toThrow(ForbiddenException);
    });

    it('does not let an uploader who lost write access delete the file from the task', async () => {
      jest.mocked(service.findById).mockResolvedValue(att({ id: 3 }));
      jest.mocked(access.assertWrite).mockImplementation(denied);
      await expect(controller.remove(1, req(UPLOADER))).rejects.toThrow(ForbiddenException);
      expect(access.assertWrite).toHaveBeenCalledWith(UPLOADER, 3);
      expect(service.remove).not.toHaveBeenCalled();
    });

    it('lets the uploader delete the file once its task is gone, and nobody else', async () => {
      jest.mocked(service.findById).mockResolvedValue(att(null));
      await expect(controller.remove(1, req(OTHER))).rejects.toThrow(ForbiddenException);
      await expect(controller.remove(1, req(UPLOADER))).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
