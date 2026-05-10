import {
  MANAGED_END_SENTINEL,
  mergeManagedTail,
  splitOnManagedSentinel,
} from '../../src/generator/managed-sentinel.js';

describe('mergeManagedTail', () => {
  const incoming = `generated\n${MANAGED_END_SENTINEL}\n`;

  it('uses incoming content when existing unmanaged file is empty', () => {
    expect(mergeManagedTail({ existing: '', incoming })).toBe(incoming);
  });

  it('uses incoming content when existing unmanaged file is whitespace only', () => {
    expect(mergeManagedTail({ existing: ' \n\t', incoming })).toBe(incoming);
  });

  it('preserves non-empty unmanaged existing content', () => {
    const existing = 'manual rules without sentinel\n';

    expect(mergeManagedTail({ existing, incoming })).toBe(existing);
  });

  it('preserves content with only the managed-start sentinel', () => {
    const existing = '<!-- agents-workflows:managed-start -->\nmanual partial block\n';

    expect(mergeManagedTail({ existing, incoming })).toBe(existing);
  });

  it('replaces managed content when existing has no user tail', () => {
    const existing = `old generated\n${MANAGED_END_SENTINEL}\n`;

    expect(mergeManagedTail({ existing, incoming })).toBe(incoming);
  });

  it('preserves user tail after the managed-end sentinel', () => {
    const existing = `old generated\n${MANAGED_END_SENTINEL}\nmanual tail\n`;

    expect(mergeManagedTail({ existing, incoming })).toBe(`generated\n${MANAGED_END_SENTINEL}\nmanual tail\n`);
  });
});

describe('splitOnManagedSentinel', () => {
  it('splits at the first managed-end sentinel', () => {
    const content = `one\n${MANAGED_END_SENTINEL}\ntwo\n${MANAGED_END_SENTINEL}\nthree\n`;

    expect(splitOnManagedSentinel(content)).toEqual({
      managed: `one\n${MANAGED_END_SENTINEL}`,
      userTail: `\ntwo\n${MANAGED_END_SENTINEL}\nthree\n`,
    });
  });
});
