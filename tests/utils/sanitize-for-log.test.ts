import { sanitizeForLog } from '../../src/utils/logger.js';

describe('sanitizeForLog', () => {
  it('passes through a clean string unchanged', () => {
    expect(sanitizeForLog('apps/web')).toBe('apps/web');
  });

  it('strips ANSI escape sequences', () => {
    expect(sanitizeForLog('\x1b[31mred\x1b[0m')).toBe('red');
    expect(sanitizeForLog('\x1b[1;32mbold green\x1b[0m')).toBe('bold green');
  });

  it('strips control characters (0x00-0x1F)', () => {
    expect(sanitizeForLog('a\x00b\x01c')).toBe('abc');
    expect(sanitizeForLog('line1\nline2')).toBe('line1line2');
    expect(sanitizeForLog('line1\r\nline2')).toBe('line1line2');
  });

  it('strips DEL character (0x7F)', () => {
    expect(sanitizeForLog('val\x7Fue')).toBe('value');
  });

  it('handles empty string', () => {
    expect(sanitizeForLog('')).toBe('');
  });

  it('strips tab characters', () => {
    expect(sanitizeForLog('col1\tcol2')).toBe('col1col2');
  });
});
