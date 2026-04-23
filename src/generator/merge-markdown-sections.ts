import type { Root, Heading, Html, RootContent } from 'mdast';

export interface Section {
  heading: Heading | null;
  /** Nodes that precede the heading within the section (managed marker comment). */
  prefix: RootContent[];
  /** Body nodes after the heading (or all nodes if no heading). */
  body: RootContent[];
  /** Heading text content, trimmed. Null for preamble (nodes before first heading). */
  headingText: string | null;
  isManaged: boolean;
}

/**
 * Extracts the plain text of a heading by concatenating all descendant Text node values.
 */
export function headingText(node: Heading): string {
  return node.children
    .flatMap((child) => ('value' in child ? [child.value] : []))
    .join('')
    .trim();
}

/**
 * Returns true if the node is an HTML comment containing the managed marker.
 */
function isManagedMarker(node: RootContent): boolean {
  return node.type === 'html' && /agents-workflows:managed/.test((node as Html).value);
}

/**
 * Splits a parsed mdast Root into logical sections.
 * Each section is delimited by a top-level heading.
 * The preamble (nodes before the first heading) is section 0 with headingText null.
 */
export function splitSections(tree: Root): Section[] {
  const sections: Section[] = [];
  let currentPrefix: RootContent[] = [];
  let currentHeading: Heading | null = null;
  let currentBody: RootContent[] = [];
  let isManaged = false;

  function flush(): void {
    sections.push({
      heading: currentHeading,
      prefix: currentPrefix,
      body: currentBody,
      headingText: currentHeading ? headingText(currentHeading) : null,
      isManaged,
    });
  }

  for (const node of tree.children) {
    if (node.type === 'heading') {
      flush();
      // Determine if the last node of the previous body is a managed marker.
      const prevBody = sections[sections.length - 1]?.body ?? [];
      const lastOfPrev = prevBody[prevBody.length - 1];
      const markerInPrev = lastOfPrev !== undefined && isManagedMarker(lastOfPrev);

      if (markerInPrev) {
        // Move the marker from the previous section's body to this section's prefix.
        const prev = sections[sections.length - 1];
        prev.body = prev.body.slice(0, -1);
        currentPrefix = [lastOfPrev];
        isManaged = true;
      } else {
        currentPrefix = [];
        isManaged = false;
      }

      currentHeading = node as Heading;
      currentBody = [];
    } else {
      currentBody.push(node);
    }
  }

  // Flush last section.
  flush();

  return sections;
}

/**
 * Returns a set of heading texts that are managed in the given sections list.
 */
export function managedHeadingTexts(sections: Section[]): Set<string> {
  return new Set(
    sections
      .filter((section) => section.isManaged && section.headingText !== null)
      .map((section) => section.headingText as string),
  );
}
