import { generateAll } from '../../src/generator/index.js';
import type { GeneratedFile } from '../../src/generator/types.js';
import { makeStackConfig, findFile, getContent } from './fixtures.js';

const COMPLIANCE_PATH = 'docs/COMPLIANCE.md';
const OSCAL_PATH = 'docs/oscal/component-definition.json';

interface OscalMetadata {
  title: unknown;
  'last-modified': unknown;
  version: unknown;
  'oscal-version': unknown;
}

interface OscalComponentDefinition {
  uuid: unknown;
  metadata: OscalMetadata;
  components: unknown[];
}

interface OscalDocument {
  'component-definition': OscalComponentDefinition;
}

function parseOscal(files: GeneratedFile[]): OscalComponentDefinition {
  const raw = getContent(files, OSCAL_PATH);
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('component-definition' in parsed)) {
    throw new Error(`OSCAL JSON missing 'component-definition' root key: ${raw.slice(0, 120)}`);
  }
  return (parsed as OscalDocument)['component-definition'];
}

describe('Epic 8 T4 — OSCAL compliance: off by default', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig());
  });

  it('does not emit docs/COMPLIANCE.md when governance.enabled is false', () => {
    expect(findFile(files, COMPLIANCE_PATH)).toBeUndefined();
  });

  it('does not emit docs/oscal/component-definition.json when governance.enabled is false', () => {
    expect(findFile(files, OSCAL_PATH)).toBeUndefined();
  });
});

describe('Epic 8 T4 — OSCAL compliance: emitted when governance.enabled', () => {
  let files: GeneratedFile[];

  beforeAll(async () => {
    files = await generateAll(makeStackConfig({ governance: { enabled: true } }));
  });

  it('emits docs/COMPLIANCE.md when governance.enabled is true', () => {
    expect(findFile(files, COMPLIANCE_PATH)).toBeDefined();
  });

  it('emits docs/oscal/component-definition.json when governance.enabled is true', () => {
    expect(findFile(files, OSCAL_PATH)).toBeDefined();
  });

  it('COMPLIANCE.md contains OSCAL explanation', () => {
    expect(getContent(files, COMPLIANCE_PATH)).toContain('OSCAL');
  });

  it('COMPLIANCE.md mentions NIST 800-53', () => {
    expect(getContent(files, COMPLIANCE_PATH)).toContain('NIST SP 800-53');
  });

  it('COMPLIANCE.md mentions continuous compliance', () => {
    expect(getContent(files, COMPLIANCE_PATH)).toContain('continuous compliance');
  });

  it('COMPLIANCE.md documents the UUID placeholder regeneration step', () => {
    expect(getContent(files, COMPLIANCE_PATH)).toContain('00000000-0000-0000-0000-000000000000');
  });

  it('COMPLIANCE.md references secret scanning control', () => {
    expect(getContent(files, COMPLIANCE_PATH)).toContain('Secret scanning');
  });

  it('COMPLIANCE.md references branch protection control', () => {
    expect(getContent(files, COMPLIANCE_PATH)).toContain('Branch protection');
  });

  it('oscal-component.json parses as valid JSON', () => {
    expect(() => parseOscal(files)).not.toThrow();
  });

  it('oscal-component.json contains component-definition.uuid', () => {
    expect(parseOscal(files).uuid).toBeDefined();
  });

  it('oscal-component.json contains metadata.title', () => {
    expect(parseOscal(files).metadata.title).toBeDefined();
  });

  it('oscal-component.json contains metadata.last-modified', () => {
    expect(parseOscal(files).metadata['last-modified']).toBeDefined();
  });

  it('oscal-component.json contains metadata.version', () => {
    expect(parseOscal(files).metadata.version).toBeDefined();
  });

  it('oscal-component.json contains metadata.oscal-version set to 1.2.1', () => {
    expect(parseOscal(files).metadata['oscal-version']).toBe('1.2.1');
  });

  it('oscal-component.json contains at least one components entry', () => {
    const { components } = parseOscal(files);
    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThanOrEqual(1);
  });

  it('oscal-component.json title includes project name', () => {
    expect(String(parseOscal(files).metadata.title)).toContain('test-app');
  });
});
