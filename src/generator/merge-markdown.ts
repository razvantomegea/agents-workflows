import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { Root, RootContent } from 'mdast';
import { splitSections, managedHeadingTexts } from './merge-markdown-sections.js';
import type { Section } from './merge-markdown-sections.js';

const PARSER = unified().use(remarkParse);
const SERIALIZER = unified().use(remarkStringify);

function parse(markdown: string): Root {
  return PARSER.parse(markdown) as Root;
}

function serialize(tree: Root): string {
  return SERIALIZER.stringify(tree);
}

/**
 * Builds a Root node from a flat list of RootContent nodes.
 */
function buildRoot(children: RootContent[]): Root {
  return { type: 'root', children };
}

/**
 * Flattens a Section back to a flat list of RootContent nodes
 * in order: prefix, heading, body.
 */
function sectionToNodes(section: Section): RootContent[] {
  const nodes: RootContent[] = [...section.prefix];
  if (section.heading !== null) {
    nodes.push(section.heading);
  }
  nodes.push(...section.body);
  return nodes;
}

/**
 * Merges two Markdown strings with section-level awareness.
 *
 * Rules:
 * 1. User heading (no managed marker) → user body wins.
 * 2. Managed heading (marked with <!-- agents-workflows:managed -->) → incoming body wins.
 * 3. New managed headings in incoming only → appended.
 * 4. Headings in existing only → preserved as-is.
 * 5. If either side marks a heading as managed, treat it as managed (incoming wins).
 *
 * The `path` argument is accepted to satisfy the MergeFunction contract
 * expected by writeFileSafe but is unused by the merge logic.
 */
export async function mergeMarkdown({
  existing,
  incoming,
  // reason: accepted to satisfy MergeFunction contract; not needed for logic
  path: _path,
}: {
  existing: string;
  incoming: string;
  path?: string;
}): Promise<string> {
  if (existing.trim() === '') return incoming;
  if (incoming.trim() === '') return existing;

  const existingTree = parse(existing);
  const incomingTree = parse(incoming);

  const existingSections = splitSections(existingTree);
  const incomingSections = splitSections(incomingTree);

  const incomingByHeading = new Map<string, Section>();
  for (const section of incomingSections) {
    if (section.headingText !== null) {
      incomingByHeading.set(section.headingText, section);
    }
  }

  // Managed headings on either side → incoming wins.
  const existingManagedTexts = managedHeadingTexts(existingSections);
  const incomingManagedTexts = managedHeadingTexts(incomingSections);
  const allManagedTexts = new Set([...existingManagedTexts, ...incomingManagedTexts]);

  const mergedNodes: RootContent[] = [];
  const handledHeadings = new Set<string>();

  for (const section of existingSections) {
    if (section.headingText === null) {
      // Preamble: preserve existing.
      mergedNodes.push(...sectionToNodes(section));
      continue;
    }

    const text = section.headingText;
    handledHeadings.add(text);

    const isManaged = allManagedTexts.has(text);
    const incomingSection = incomingByHeading.get(text);

    if (isManaged && incomingSection !== undefined) {
      // Managed + present in incoming → use incoming body with managed prefix.
      const managedPrefix = incomingSection.prefix.length > 0
        ? incomingSection.prefix
        : section.prefix;
      mergedNodes.push(...managedPrefix);
      mergedNodes.push(incomingSection.heading ?? section.heading!);
      mergedNodes.push(...incomingSection.body);
    } else {
      // User section or managed but not in incoming → preserve existing.
      mergedNodes.push(...sectionToNodes(section));
    }
  }

  // Append new managed sections from incoming not present in existing.
  for (const section of incomingSections) {
    if (section.headingText === null) continue;
    if (handledHeadings.has(section.headingText)) continue;
    if (!incomingManagedTexts.has(section.headingText)) continue;

    mergedNodes.push(...sectionToNodes(section));
  }

  return serialize(buildRoot(mergedNodes));
}
