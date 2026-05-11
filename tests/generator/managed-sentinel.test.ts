import {
  MANAGED_END_SENTINEL,
  mergeManagedTail,
  splitOnManagedSentinel,
} from '../../src/generator/managed-sentinel.js';

describe('managed sentinel helpers', () => {
  it('returns empty user tail when sentinel is absent', () => {
    expect(splitOnManagedSentinel('custom content')).toEqual({
      managed: 'custom content',
      userTail: '',
    });
  });

  it('splits managed content from user tail at the sentinel', () => {
    const content = `managed\n${MANAGED_END_SENTINEL}\nuser tail`;

    expect(splitOnManagedSentinel(content)).toEqual({
      managed: `managed\n${MANAGED_END_SENTINEL}`,
      userTail: '\nuser tail',
    });
  });

  it('keeps later sentinel strings in the user tail', () => {
    const content = `managed\n${MANAGED_END_SENTINEL}\nuser ${MANAGED_END_SENTINEL}`;

    expect(splitOnManagedSentinel(content)).toEqual({
      managed: `managed\n${MANAGED_END_SENTINEL}`,
      userTail: `\nuser ${MANAGED_END_SENTINEL}`,
    });
  });

  it('preserves existing content when existing lacks the sentinel', () => {
    const existing = 'custom content';
    const incoming = `generated\n${MANAGED_END_SENTINEL}\n`;

    expect(mergeManagedTail({ existing, incoming })).toBe(existing);
  });

  it('preserves existing content when incoming lacks the sentinel', () => {
    const existing = `managed\n${MANAGED_END_SENTINEL}\nuser tail`;
    const incoming = 'broken generated content';

    expect(mergeManagedTail({ existing, incoming })).toBe(existing);
  });

  it('preserves user tail when both files have the sentinel', () => {
    const existing = `old\n${MANAGED_END_SENTINEL}\nuser tail`;
    const incoming = `new\n${MANAGED_END_SENTINEL}\n`;

    expect(mergeManagedTail({ existing, incoming })).toBe(`new\n${MANAGED_END_SENTINEL}\nuser tail`);
  });

  it('returns incoming content when existing has no user tail', () => {
    const existing = `old\n${MANAGED_END_SENTINEL}\n`;
    const incoming = `new\n${MANAGED_END_SENTINEL}\n`;

    expect(mergeManagedTail({ existing, incoming })).toBe(incoming);
  });
});
