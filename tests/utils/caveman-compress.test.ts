import { cavemanCompress } from '../../src/utils/caveman-compress.js';

describe('cavemanCompress', () => {
  it('returns empty string unchanged', () => {
    expect(cavemanCompress('')).toBe('');
  });

  it('strips "please note that"', () => {
    expect(cavemanCompress('please note that this is important')).toBe('this is important');
  });

  it('strips "it is important that"', () => {
    expect(cavemanCompress('it is important that you read this')).toBe('you read this');
  });

  it('replaces "in order to" with "to"', () => {
    expect(cavemanCompress('in order to run the tests')).toBe('to run the tests');
  });

  it('strips "make sure to"', () => {
    expect(cavemanCompress('make sure to add types')).toBe('add types');
  });

  it('strips "note that"', () => {
    expect(cavemanCompress('note that this applies globally')).toBe('this applies globally');
  });

  it('strips "keep in mind that"', () => {
    expect(cavemanCompress('keep in mind that errors propagate')).toBe('errors propagate');
  });

  it('strips hedging adverbs', () => {
    expect(cavemanCompress('basically run the command')).toBe('run the command');
    expect(cavemanCompress('simply delete the file')).toBe('delete the file');
    expect(cavemanCompress('essentially a wrapper')).toBe('a wrapper');
  });

  it('strips pleasantries', () => {
    expect(cavemanCompress('of course you can skip this')).toBe('you can skip this');
    expect(cavemanCompress('certainly, proceed with caution')).toBe('proceed with caution');
    expect(cavemanCompress('feel free to add more tests')).toBe('add more tests');
  });

  it('preserves fenced code blocks unchanged', () => {
    const input = 'please note that:\n```bash\nplease note that this is code\n```\nend';
    const result = cavemanCompress(input);
    expect(result).toContain('```bash\nplease note that this is code\n```');
    expect(result).not.toMatch(/^please note that:/m);
  });

  it('preserves inline code unchanged', () => {
    const input = 'note that `please note that` is a placeholder';
    const result = cavemanCompress(input);
    expect(result).toContain('`please note that`');
    expect(result).not.toMatch(/^note that /);
  });

  it('leaves content without filler unchanged', () => {
    const clean = 'Run the tests. Fix the errors. Ship it.';
    expect(cavemanCompress(clean)).toBe(clean);
  });
});
