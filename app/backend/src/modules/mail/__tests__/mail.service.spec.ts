import { Logger } from '@nestjs/common';
import { asMock, Mocks } from '../../../common/__tests__/test-utils';
import { MailService } from '../mail.service';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: (...a: unknown[]) => sendMail(...a) })),
}));
import * as nodemailer from 'nodemailer';

const KEYS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM',
  'PUBLIC_URL',
  'CORS_ORIGIN',
  'NODE_ENV',
];

describe('MailService', () => {
  const saved: Record<string, string | undefined> = {};
  const settings: Mocks = { getAppName: jest.fn(async () => 'MyApp') };

  beforeEach(() => {
    KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
    sendMail.mockReset();
    (nodemailer.createTransport as jest.Mock).mockClear();
  });
  afterEach(() => {
    KEYS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
    jest.restoreAllMocks();
  });

  describe('link()', () => {
    it('falls back to local dev', () => {
      expect(new MailService(asMock(settings)).link('/reset')).toBe('http://localhost:5173/reset');
    });
    it('prefers PUBLIC_URL over CORS_ORIGIN and strips trailing slashes', () => {
      process.env.CORS_ORIGIN = 'http://cors';
      process.env.PUBLIC_URL = 'https://app.example.com//';
      expect(new MailService(asMock(settings)).link('/x')).toBe('https://app.example.com/x');
    });
    it('uses CORS_ORIGIN when no PUBLIC_URL', () => {
      process.env.CORS_ORIGIN = 'http://cors';
      expect(new MailService(asMock(settings)).link('/x')).toBe('http://cors/x');
    });
    it('encodes query parameters', () => {
      const url = new MailService(asMock(settings)).link('/reset', { token: 'a b&c=d' });
      expect(url).toBe('http://localhost:5173/reset?token=a+b%26c%3Dd');
    });
  });

  it('appName() delegates to app settings', async () => {
    expect(await new MailService(asMock(settings)).appName()).toBe('MyApp');
  });

  describe('without SMTP_HOST', () => {
    it('is disabled, creates no transport, send() returns false and logs the body outside production', async () => {
      const svc = new MailService(asMock(settings));
      const log = jest.spyOn(asMock<{ logger: Logger }>(svc).logger, 'log').mockImplementation();
      expect(svc.enabled).toBe(false);
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(await svc.send({ to: 'a@b.c', subject: 'Hi', text: 'secret-link' })).toBe(false);
      expect(log.mock.calls[0][0]).toContain('secret-link');
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('does not log the body in production', async () => {
      process.env.NODE_ENV = 'production';
      const svc = new MailService(asMock(settings));
      const log = jest.spyOn(asMock<{ logger: Logger }>(svc).logger, 'log').mockImplementation();
      await svc.send({ to: 'a@b.c', subject: 'Hi', text: 'secret-link' });
      expect(log.mock.calls[0][0]).not.toContain('secret-link');
    });

    it('warns at construction in production', () => {
      process.env.NODE_ENV = 'production';
      const warn = jest.spyOn(require('@nestjs/common').Logger.prototype, 'warn').mockImplementation();
      new MailService(asMock(settings));
      expect(warn).toHaveBeenCalled();
    });
  });

  describe('with SMTP_HOST', () => {
    beforeEach(() => {
      process.env.SMTP_HOST = 'smtp.example.com';
    });

    it('creates the transport with defaults', () => {
      const svc = new MailService(asMock(settings));
      expect(svc.enabled).toBe(true);
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: undefined,
      });
    });

    it('honours port, secure and auth settings', () => {
      Object.assign(process.env, { SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'u', SMTP_PASS: 'p' });
      new MailService(asMock(settings));
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'u', pass: 'p' },
      });
    });

    it('sends with the default From and returns true', async () => {
      sendMail.mockResolvedValue({});
      const msg = { to: 'a@b.c', subject: 'S', text: 'T' };
      expect(await new MailService(asMock(settings)).send(msg)).toBe(true);
      expect(sendMail).toHaveBeenCalledWith({ from: 'NOAgenda <no-reply@localhost>', ...msg });
    });

    it('uses MAIL_FROM', async () => {
      process.env.MAIL_FROM = 'X <x@y.z>';
      sendMail.mockResolvedValue({});
      await new MailService(asMock(settings)).send({ to: 'a@b.c', subject: 'S', text: 'T' });
      expect(sendMail.mock.calls[0][0].from).toBe('X <x@y.z>');
    });

    it('never throws: returns false and logs an error on delivery failure', async () => {
      sendMail.mockRejectedValue(new Error('boom'));
      const svc = new MailService(asMock(settings));
      const err = jest.spyOn(asMock<{ logger: Logger }>(svc).logger, 'error').mockImplementation();
      await expect(svc.send({ to: 'a@b.c', subject: 'S', text: 'T' })).resolves.toBe(false);
      expect(err.mock.calls[0][0]).toContain('boom');
    });
  });
});
