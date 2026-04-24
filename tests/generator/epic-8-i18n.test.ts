import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import {
  makeStackConfig,
  getContent,
  IMPLEMENTER_PATH,
  UI_DESIGNER_PATH,
  I18N_HEADING,
} from './fixtures.js';

describe('Epic 8 T2 — i18n section absent by default', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('implementer.md does not contain Internationalization section when hasI18n is false', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).not.toContain(I18N_HEADING);
  });

  it('ui-designer.md does not contain Internationalization section when hasI18n is false', () => {
    expect(getContent(files, UI_DESIGNER_PATH)).not.toContain(I18N_HEADING);
  });
});

describe('Epic 8 T2 — i18n section present when i18nLibrary is set', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(
      makeStackConfig({ stack: { i18nLibrary: 'i18next' } }),
    );
  });

  it('implementer.md contains Internationalization heading', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain(I18N_HEADING);
  });

  it('implementer.md contains ICU MessageFormat rule', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('ICU');
  });

  it('implementer.md contains Intl.* rule', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('Intl.*');
  });

  it('implementer.md contains Accept-Language rule', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('Accept-Language');
  });

  it('implementer.md contains CLDR plural categories rule', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('CLDR plural categories');
  });

  it('implementer.md contains Temporal rule', () => {
    expect(getContent(files, IMPLEMENTER_PATH)).toContain('Temporal');
  });

  it('ui-designer.md contains Internationalization heading', () => {
    expect(getContent(files, UI_DESIGNER_PATH)).toContain(I18N_HEADING);
  });

  it('ui-designer.md contains CSS logical properties rule', () => {
    expect(getContent(files, UI_DESIGNER_PATH)).toContain('CSS logical properties');
  });

  it('ui-designer.md contains RTL readiness rule', () => {
    expect(getContent(files, UI_DESIGNER_PATH)).toContain('RTL');
  });
});
