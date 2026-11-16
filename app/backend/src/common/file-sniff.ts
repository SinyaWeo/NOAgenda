import { open } from 'fs/promises';

export type SniffedType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' | null;

/**
 * What a file REALLY is, from its first bytes. A browser-supplied Content-Type is only a claim:
 * anyone can upload HTML or a script labelled "image/png".
 */
export function sniffBuffer(b: Buffer): SniffedType {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length >= 6 && (b.subarray(0, 6).toString('latin1') === 'GIF87a' || b.subarray(0, 6).toString('latin1') === 'GIF89a')) return 'image/gif';
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

export async function sniffFile(path: string): Promise<SniffedType> {
  const fh = await open(path, 'r');
  try {
    const buf = Buffer.alloc(16);
    const { bytesRead } = await fh.read(buf, 0, 16, 0);
    return sniffBuffer(buf.subarray(0, bytesRead));
  } finally {
    await fh.close();
  }
}
