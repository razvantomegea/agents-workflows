import { _resetPartialsCache, listPartials } from '../../src/generator/list-partials.js';

describe('listPartials', () => {
  afterEach(() => {
    _resetPartialsCache();
  });

  it('does not let callers mutate cached partial entries', async () => {
    const firstRead = await listPartials();
    const originalSlug = firstRead[0]?.slug;
    expect(originalSlug).toBeDefined();

    firstRead[0]!.slug = 'mutated-slug';

    const secondRead = await listPartials();
    expect(secondRead[0]?.slug).toBe(originalSlug);
  });
});
