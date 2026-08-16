import { resolveCollisionSafeName, sanitizeFileName } from '@/lib/security/filename';

describe('sanitizeFileName', () => {
  it('leaves an ordinary filename untouched', () => {
    expect(sanitizeFileName('vacation-photo.jpg')).toBe('vacation-photo.jpg');
  });

  it('strips path traversal segments', () => {
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('..');
  });

  it('strips directory separators entirely', () => {
    const result = sanitizeFileName('folder/subfolder/file.txt');
    expect(result).not.toMatch(/[/\\]/);
  });

  it('rejects an absolute path by stripping its separators', () => {
    const result = sanitizeFileName('/etc/passwd');
    expect(result).not.toMatch(/^\//);
  });

  it('strips control characters', () => {
    const result = sanitizeFileName('file\x00name.txt');
    // eslint-disable-next-line no-control-regex
    expect(result).not.toMatch(/[\x00-\x1f\x7f]/);
  });

  it('falls back to a default name when nothing usable remains', () => {
    expect(sanitizeFileName('../../..')).toBe('file');
    expect(sanitizeFileName('')).toBe('file');
  });

  it('neutralizes Windows-reserved device names', () => {
    expect(sanitizeFileName('CON.txt')).not.toBe('CON.txt');
    expect(sanitizeFileName('con')).not.toBe('con');
  });

  it('truncates very long names while preserving a short extension', () => {
    const longName = `${'a'.repeat(300)}.txt`;
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('.txt')).toBe(true);
  });

  it('replaces Windows-reserved punctuation characters', () => {
    const result = sanitizeFileName('weird:name*file?.txt');
    expect(result).not.toMatch(/[:*?]/);
  });
});

describe('resolveCollisionSafeName', () => {
  it('returns the name unchanged when there is no collision', () => {
    expect(resolveCollisionSafeName('photo.jpg', new Set())).toBe('photo.jpg');
  });

  it('appends (1) on a single collision', () => {
    expect(resolveCollisionSafeName('photo.jpg', new Set(['photo.jpg']))).toBe('photo (1).jpg');
  });

  it('finds the next free number across multiple collisions', () => {
    const existing = new Set(['photo.jpg', 'photo (1).jpg', 'photo (2).jpg']);
    expect(resolveCollisionSafeName('photo.jpg', existing)).toBe('photo (3).jpg');
  });

  it('handles files with no extension', () => {
    expect(resolveCollisionSafeName('README', new Set(['README']))).toBe('README (1)');
  });
});
