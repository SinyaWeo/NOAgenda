import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { isIP } from 'net';
import { BLOCKED_ADDRESS, isPrivateAddress, publicLookup } from './url-guard';

export const SAFE_POST_TIMEOUT_MS = 5000;

/**
 * POST `body` to a URL a user gave us (webhooks, chat channels) and resolve with the HTTP status.
 *
 * Redirects are not followed (they could lead somewhere internal), and the connection goes through
 * {@link publicLookup}, which refuses internal addresses using the very DNS answer it connects to.
 * Rejects with `code: BLOCKED_ADDRESS` for an internal target, or with the network / timeout error.
 * Call `assertPublicHttpUrl` first for a readable error about the URL itself.
 */
export function safePost(
  rawUrl: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs = SAFE_POST_TIMEOUT_MS,
): Promise<number> {
  const url = new URL(rawUrl);
  // The lookup function is not consulted for IP literals, so check those here.
  const literal = url.hostname.replace(/^\[|\]$/g, '');
  if (process.env.WEBHOOK_ALLOW_PRIVATE !== 'true' && isIP(literal) && isPrivateAddress(literal)) {
    return Promise.reject(Object.assign(new Error('url must point to a public address'), { code: BLOCKED_ADDRESS }));
  }
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise<number>((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        lookup: publicLookup,
        signal: AbortSignal.timeout(timeoutMs),
      },
      (res) => {
        res.resume(); // the response body is not needed
        resolve(res.statusCode ?? 0);
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}
