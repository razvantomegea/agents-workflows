import { describe, expect, it } from '@jest/globals';
import { HOST_OS_WARNING, printHostOsWarning } from '../../src/prompt/host-os-disclosure.js';

type StdoutWrite = typeof process.stdout.write;

function captureStdoutWrites(fn: () => void): string[] {
  const original: StdoutWrite = process.stdout.write.bind(process.stdout);
  const captured: string[] = [];
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    captured.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  }) as StdoutWrite;

  try {
    fn();
  } finally {
    process.stdout.write = original;
  }

  return captured;
}

describe('host-os-disclosure', () => {
  describe('HOST_OS_WARNING', () => {
    it('mentions every read-exposure path the disclosure must cover', () => {
      expect(HOST_OS_WARNING).toContain('~/.ssh');
      expect(HOST_OS_WARNING).toContain('~/.aws/credentials');
      expect(HOST_OS_WARNING).toContain('~/.config/gh/hosts.yml');
      expect(HOST_OS_WARNING).toContain('Browser cookie stores');
      expect(HOST_OS_WARNING).toContain('%APPDATA%');
    });

    it('clarifies that workspace-write does not restrict reads', () => {
      expect(HOST_OS_WARNING).toContain('restricts WRITES only');
    });
  });

  describe('printHostOsWarning', () => {
    it('writes the warning surrounded by blank-line padding to stdout', () => {
      const captured = captureStdoutWrites(() => printHostOsWarning());

      expect(captured).toHaveLength(1);
      expect(captured[0]).toBe('\n' + HOST_OS_WARNING + '\n\n');
    });
  });
});
