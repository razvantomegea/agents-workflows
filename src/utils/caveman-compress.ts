const PLACEHOLDER_PREFIX = '\x00CODE\x00';

type CodeBlocks = Map<string, string>;

function extractCodeBlocks(content: string): { text: string; blocks: CodeBlocks } {
  const blocks: CodeBlocks = new Map();
  let index = 0;

  const withFenced = content.replace(/```[\s\S]*?```/g, (match) => {
    const key = `${PLACEHOLDER_PREFIX}${index++}\x00`;
    blocks.set(key, match);
    return key;
  });

  const withInline = withFenced.replace(/`[^`\n]+`/g, (match) => {
    const key = `${PLACEHOLDER_PREFIX}${index++}\x00`;
    blocks.set(key, match);
    return key;
  });

  return { text: withInline, blocks };
}

function restoreCodeBlocks(text: string, blocks: CodeBlocks): string {
  let result = text;
  for (const [key, value] of blocks) {
    result = result.split(key).join(value);
  }
  return result;
}

const FILLER_PATTERNS: Array<[RegExp, string]> = [
  [/\bplease note that[,:]?\s*/gi, ''],
  [/\bit is important (?:to|that)\s*/gi, ''],
  [/\bin order to\s+/gi, 'to '],
  [/\bmake sure to\s+/gi, ''],
  [/\bnote that[,:]?\s*/gi, ''],
  [/\bkeep in mind that[,:]?\s*/gi, ''],
  [/\b(?:basically|simply|essentially)\s+/gi, ''],
  [/\b(?:of course|certainly|feel free to|happy to)[,.]?\s*/gi, ''],
];

function stripFiller(text: string): string {
  return FILLER_PATTERNS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

export function cavemanCompress(content: string): string {
  if (!content) return content;
  const { text, blocks } = extractCodeBlocks(content);
  const compressed = stripFiller(text);
  return restoreCodeBlocks(compressed, blocks);
}
