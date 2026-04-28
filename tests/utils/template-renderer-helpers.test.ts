import { markdownText, markdownCode } from '../../src/utils/template-renderer.js';

describe('markdownCode', () => {
  it('wraps a plain value in backticks', () => {
    expect(markdownCode('pnpm test')).toBe('`pnpm test`');
  });

  it('strips newlines and replaces with space', () => {
    expect(markdownCode('line1\nline2')).toBe('`line1 line2`');
    expect(markdownCode('line1\r\nline2')).toBe('`line1 line2`');
  });

  it('escapes values that already contain backticks by using double-backtick fence', () => {
    expect(markdownCode('back`tick')).toBe("`` back'tick ``");
  });

  it('strips ASCII control characters (0x00–0x08, 0x0B, 0x0C, 0x0E–0x1F, 0x7F)', () => {
    const withControl = 'val\x01ue\x7F';
    expect(markdownCode(withControl)).toBe('`value`');
  });

  it('handles null and undefined gracefully', () => {
    expect(markdownCode(null)).toBe('``');
    expect(markdownCode(undefined)).toBe('``');
  });

  it('handles empty string', () => {
    expect(markdownCode('')).toBe('``');
  });
});

describe('markdownText', () => {
  it('escapes HTML special characters', () => {
    expect(markdownText('<script>')).toBe('&lt;script&gt;');
    expect(markdownText('a & b')).toBe('a &amp; b');
  });

  it('strips newlines and replaces with space', () => {
    expect(markdownText('line1\nline2')).toBe('line1 line2');
    expect(markdownText('line1\r\nline2')).toBe('line1 line2');
  });

  it('strips ASCII control characters', () => {
    const withControl = 'val\x01ue\x7F';
    expect(markdownText(withControl)).toBe('value');
  });

  it('handles null and undefined gracefully', () => {
    expect(markdownText(null)).toBe('');
    expect(markdownText(undefined)).toBe('');
  });

  it('escapes backticks', () => {
    expect(markdownText('back`tick')).toBe('back\\`tick');
  });

  it('escapes backslashes', () => {
    expect(markdownText('C:\\path')).toBe('C:\\\\path');
  });
});
