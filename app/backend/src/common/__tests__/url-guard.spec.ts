import { BadRequestException } from '@nestjs/common';
import { assertPublicHttpUrl, isPrivateAddress } from '../url-guard';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fd12:3456::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.5',
  ])('treats %s as internal', (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '203.0.113.9', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    'treats %s as public',
    (ip) => expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe('assertPublicHttpUrl', () => {
  const bad = (u: string) => expect(assertPublicHttpUrl(u)).rejects.toBeInstanceOf(BadRequestException);
  it('rejects internal and metadata targets, credentials and other schemes', async () => {
    await bad('http://127.0.0.1/hook');
    await bad('http://localhost:3000/hook');
    await bad('http://app.localhost/hook');
    await bad('http://169.254.169.254/latest/meta-data/');
    await bad('http://[::1]/hook');
    await bad('http://10.0.0.7:8080/x');
    await bad('https://user:pass@8.8.8.8/hook');
    await bad('ftp://8.8.8.8/hook');
    await bad('file:///etc/passwd');
    await bad('not a url');
  });
  it('lets a name through that does not resolve (it cannot reach anything yet)', async () => {
    await expect(assertPublicHttpUrl('https://this-name-does-not-exist.invalid/hook')).resolves.toBeUndefined();
  });
  it('accepts a public address', async () => {
    await expect(assertPublicHttpUrl('https://8.8.8.8/hook')).resolves.toBeUndefined();
  });
  it('can be switched off for deliveries to internal services', async () => {
    process.env.WEBHOOK_ALLOW_PRIVATE = 'true';
    try {
      await expect(assertPublicHttpUrl('http://127.0.0.1/hook')).resolves.toBeUndefined();
    } finally {
      delete process.env.WEBHOOK_ALLOW_PRIVATE;
    }
  });
});
