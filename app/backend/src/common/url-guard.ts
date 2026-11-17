import { BadRequestException } from '@nestjs/common';
import { lookup, LookupAddress } from 'dns';
import { lookup as lookupAsync } from 'dns/promises';
import { isIP, LookupFunction } from 'net';

/**
 * Is this IP one a public webhook must never reach? Covers loopback, private (RFC 1918 / ULA),
 * link-local (including the cloud metadata address 169.254.169.254), CGNAT, "this network",
 * multicast/reserved, and IPv4-mapped IPv6 forms of all of those.
 */
export function isPrivateAddress(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (isIP(ip) === 6) {
    const x = ip.toLowerCase();
    return (
      x === '::' ||
      x === '::1' ||
      x.startsWith('fc') ||
      x.startsWith('fd') ||
      x.startsWith('fe8') ||
      x.startsWith('fe9') ||
      x.startsWith('fea') ||
      x.startsWith('feb') ||
      x.startsWith('ff')
    );
  }
  return true; // not an IP we understand: refuse
}

/**
 * Throw unless `raw` is an http(s) URL without credentials whose host resolves only to public
 * addresses. Resolving here protects the stored value; whatever later SENDS the request must call
 * this again right before connecting (DNS can change), and must not follow redirects blindly.
 * Set WEBHOOK_ALLOW_PRIVATE=true to deliver to internal services on purpose.
 */
export async function assertPublicHttpUrl(raw: string): Promise<void> {
  if (process.env.WEBHOOK_ALLOW_PRIVATE === 'true') return;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('url must be a valid http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new BadRequestException('url must be a valid http(s) URL');
  if (url.username || url.password) throw new BadRequestException('url must not contain a username or password');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host.toLowerCase() === 'localhost' || host.toLowerCase().endsWith('.localhost')) {
    throw new BadRequestException('url must point to a public address, not an internal one');
  }
  const addresses = isIP(host)
    ? [host]
    : (await lookupAsync(host, { all: true }).catch(() => [])).map((a) => a.address);
  // A name that does not resolve (yet) reaches nothing, so it is not an internal target. DNS can change
  // later, which is why the code that delivers a webhook must check again right before connecting.
  if (addresses.length === 0) return;
  if (addresses.some(isPrivateAddress)) {
    throw new BadRequestException('url must point to a public address, not an internal one');
  }
}

/** Error code of a connection refused by {@link publicLookup}. */
export const BLOCKED_ADDRESS = 'EBLOCKED';

/**
 * A `lookup` function for `http(s).request` that refuses internal addresses. Passing it to the request makes the
 * check and the connection use the SAME DNS answer, so a name that resolves to a public address when saved
 * cannot be switched to an internal one (DNS rebinding) between {@link assertPublicHttpUrl} and the connect.
 * The hostname itself is untouched, so TLS (SNI and certificate checks) still works.
 */
export const publicLookup: LookupFunction = (hostname, options, callback) => {
  const opts = options ?? {};
  lookup(hostname, { ...opts, all: true }, (err, list: LookupAddress[]) => {
    if (err) return callback(err, '', 4);
    if (process.env.WEBHOOK_ALLOW_PRIVATE !== 'true' && list.some((a) => isPrivateAddress(a.address))) {
      const blocked: NodeJS.ErrnoException = new Error('url must point to a public address, not an internal one');
      blocked.code = BLOCKED_ADDRESS;
      return callback(blocked, '', 4);
    }
    if (opts.all) return (callback as any)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};
