import { mergeMarkdown } from '../../src/generator/merge-markdown.js';

// ── helpers ────────────────────────────────────────────────────────────────

const MANAGED_TAG = '<!-- agents-workflows:managed -->';

function managed(heading: string, body: string): string {
  return `${MANAGED_TAG}\n${heading}\n\n${body}\n`;
}

// ── 1. Idempotency ─────────────────────────────────────────────────────────

describe('mergeMarkdown — idempotency', () => {
  it('running merge on identical inputs twice yields same output', async () => {
    const doc = [managed('## Generated', 'Generator body here.'), '## User Section\n\nUser text.\n'].join('\n');

    const first = await mergeMarkdown({ existing: doc, incoming: doc });
    const second = await mergeMarkdown({ existing: first, incoming: doc });

    expect(second).toBe(first);
  });
});

// ── 2. User heading preserved ──────────────────────────────────────────────

describe('mergeMarkdown — user heading preservation', () => {
  it('keeps a custom user section absent from incoming', async () => {
    const existing = '## My Custom Section\n\nUser wrote this.\n';
    const incoming = managed('## Generated', 'Generator body.');

    const result = await mergeMarkdown({ existing, incoming });

    expect(result).toContain('My Custom Section');
    expect(result).toContain('User wrote this.');
  });

  it('does not overwrite user heading body with incoming content', async () => {
    const existing = '## Shared\n\nUser content.\n';
    const incoming = '## Shared\n\nIncoming content.\n';

    const result = await mergeMarkdown({ existing, incoming });

    expect(result).toContain('User content.');
    expect(result).not.toContain('Incoming content.');
  });
});

// ── 3. New managed heading appended ───────────────────────────────────────

describe('mergeMarkdown — new managed heading appended', () => {
  it('appends a managed section that does not exist in existing', async () => {
    const existing = '## Existing Section\n\nSome content.\n';
    const incoming = [existing, managed('## Generated Section', 'Auto-generated content.')].join('\n');

    const result = await mergeMarkdown({ existing, incoming });

    expect(result).toContain('Existing Section');
    expect(result).toContain('Generated Section');
    expect(result).toContain('Auto-generated content.');
  });
});

// ── 4. Managed heading body overwritten ───────────────────────────────────

describe('mergeMarkdown — managed heading body overwritten', () => {
  it('replaces user-edited body in managed section with generator body', async () => {
    const existing = managed('## Generated', 'User edited this by hand.');
    const incoming = managed('## Generated', 'Fresh generator output.');

    const result = await mergeMarkdown({ existing, incoming });

    expect(result).toContain('Fresh generator output.');
    expect(result).not.toContain('User edited this by hand.');
  });
});

// ── 5. Empty existing → equals incoming ───────────────────────────────────

describe('mergeMarkdown — edge: empty existing', () => {
  it('returns incoming when existing is empty', async () => {
    const incoming = '## Hello\n\nWorld.\n';
    const result = await mergeMarkdown({ existing: '', incoming });

    expect(result).toBe(incoming);
  });
});

// ── 6. Empty incoming → equals existing ───────────────────────────────────

describe('mergeMarkdown — edge: empty incoming', () => {
  it('returns existing when incoming is empty', async () => {
    const existing = '## Hello\n\nWorld.\n';
    const result = await mergeMarkdown({ existing, incoming: '' });

    expect(result).toBe(existing);
  });
});

// ── 7. No headings (pure prose) → user wins ───────────────────────────────

describe('mergeMarkdown — edge: no headings', () => {
  it('returns existing prose when neither doc has headings', async () => {
    const existing = 'User wrote some prose.\n';
    const incoming = 'Generator prose.\n';

    const result = await mergeMarkdown({ existing, incoming });

    // No headings → no managed sections → existing wins entirely (preamble preserved).
    expect(result).toContain('User wrote some prose.');
  });
});

// ── 8. Managed on either side → incoming wins ─────────────────────────────

describe('mergeMarkdown — edge: managed tag on existing but not incoming', () => {
  it('uses incoming body when existing marks heading as managed', async () => {
    // existing marks it managed; incoming has same heading without marker.
    // Rule: if either side marks it, treat as managed → incoming wins.
    const existing = managed('## Shared', 'Old managed body.');
    const incoming = '## Shared\n\nNew generator body.\n';

    const result = await mergeMarkdown({ existing, incoming });

    expect(result).toContain('New generator body.');
    expect(result).not.toContain('Old managed body.');
  });
});
