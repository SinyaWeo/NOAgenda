import { BadRequestException, ForbiddenException, PayloadTooLargeException } from '@nestjs/common';
import { UploadPrecheckGuard } from '../upload-precheck.guard';

const ctx = (req: any): any => ({ switchToHttp: () => ({ getRequest: () => req }) });
const request = (query: any, length?: number) =>
  ({
    user: { userId: 2 },
    query,
    headers: length === undefined ? {} : { 'content-length': String(length) },
  }) as any;

describe('UploadPrecheckGuard', () => {
  let access: any;
  let attachments: any;
  let guard: UploadPrecheckGuard;

  beforeEach(() => {
    access = { assertWrite: jest.fn(async () => undefined) };
    attachments = { usedBytes: jest.fn(async () => 0) };
    guard = new UploadPrecheckGuard(access, attachments);
  });

  it('checks write access on the task and hands the id on', async () => {
    const req = request({ taskId: '7' }, 1000);
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(access.assertWrite).toHaveBeenCalledWith(2, 7);
    expect(req.uploadTaskId).toBe(7);
  });

  it.each([undefined, '', 'abc', '0', '-3', '1.5', '7abc', ['7', '8']])(
    'rejects taskId %j with 400 before any access lookup',
    async (taskId) => {
      await expect(guard.canActivate(ctx(request({ taskId })))).rejects.toBeInstanceOf(BadRequestException);
      expect(access.assertWrite).not.toHaveBeenCalled();
    },
  );

  it('refuses without write access, so multer never runs', async () => {
    access.assertWrite.mockRejectedValue(new ForbiddenException());
    await expect(guard.canActivate(ctx(request({ taskId: '7' }, 100)))).rejects.toBeInstanceOf(ForbiddenException);
    expect(attachments.usedBytes).not.toHaveBeenCalled();
  });

  it('rejects an oversized body with 413', async () => {
    const req = request({ taskId: '7' }, 11 * 1024 * 1024);
    await expect(guard.canActivate(ctx(req))).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects when the declared size would exceed the quota', async () => {
    attachments.usedBytes.mockResolvedValue(199 * 1024 * 1024);
    const req = request({ taskId: '7' }, 5 * 1024 * 1024);
    await expect(guard.canActivate(ctx(req))).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('leaves a missing Content-Length to multer', async () => {
    await expect(guard.canActivate(ctx(request({ taskId: '7' })))).resolves.toBe(true);
  });
});
