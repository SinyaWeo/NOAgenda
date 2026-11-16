import { sniffBuffer } from '../file-sniff';

const b = (...x: number[]) => Buffer.from(x);

describe('sniffBuffer', () => {
  it('recognises the supported formats by their magic bytes', () => {
    expect(sniffBuffer(b(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe('image/jpeg');
    expect(sniffBuffer(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png');
    expect(sniffBuffer(Buffer.from('GIF89a....'))).toBe('image/gif');
    expect(sniffBuffer(Buffer.from('GIF87a....'))).toBe('image/gif');
    expect(sniffBuffer(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 '))).toBe('image/webp');
    expect(sniffBuffer(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
  });
  it('does not accept look-alikes or disguised content', () => {
    expect(sniffBuffer(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
    expect(sniffBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffBuffer(Buffer.from('RIFF\x00\x00\x00\x00WAVEfmt '))).toBeNull(); // RIFF but not WebP
    expect(sniffBuffer(Buffer.alloc(0))).toBeNull();
    expect(sniffBuffer(b(0x89, 0x50))).toBeNull(); // truncated PNG signature
  });
});
