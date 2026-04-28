import { readFile, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { fileExists } from '../utils/file-exists.js';

interface ParseTomlArrayParams {
  content: string;
  sectionHeader: string;
  key: string;
}

function parseTomlArrayMembers({ content, sectionHeader, key }: ParseTomlArrayParams): string[] | null {
  const lines = content.split(/\r?\n/);
  const results: string[] = [];
  let inSection = false;
  let inArray = false;
  const escapedHeader = sectionHeader.replace(/\./g, '\\.');
  const sectionRe = new RegExp(`^\\[${escapedHeader}\\]$`);
  const keyRe = new RegExp(`^${key}\\s*=\\s*\\[`);

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/#.*$/, '').trim();
    if (!inSection) {
      if (sectionRe.test(trimmed)) inSection = true;
      continue;
    }
    if (trimmed.startsWith('[') && !inArray) {
      if (trimmed.startsWith(`[${sectionHeader}.`)) continue; // subsection of current section — stay in
      inSection = false;
      continue;
    }
    if (!inArray) {
      if (keyRe.test(trimmed)) {
        inArray = true;
        const afterBracket = trimmed.replace(/^[^[]*\[/, '');
        extractQuotedValues(afterBracket, results);
        if (afterBracket.includes(']')) break;
      }
      continue;
    }
    if (trimmed.includes(']')) {
      extractQuotedValues(trimmed.replace(/].*$/, ''), results);
      break;
    }
    extractQuotedValues(trimmed, results);
  }

  return results.length > 0 ? results : null;
}

function extractQuotedValues(text: string, out: string[]): void {
  const re = /["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1]);
  }
}

function extractIncludeValues(text: string, out: string[]): void {
  const re = /include\s*=\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1]);
  }
}

async function readPyprojectToml(projectRoot: string): Promise<string | null> {
  const file = join(projectRoot, 'pyproject.toml');
  if (!(await fileExists(file))) return null;
  return readFile(file, 'utf-8');
}

export async function readCargoWorkspace(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'Cargo.toml');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parseTomlArrayMembers({ content, sectionHeader: 'workspace', key: 'members' });
}

export async function readGoWork(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'go.work');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parseGoWork(content);
}

function parseGoWork(content: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const results: string[] = [];
  let inBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\/\/.*$/, '').trim();
    if (!inBlock) {
      if (/^use\s+\(/.test(line)) {
        inBlock = true;
        continue;
      }
      const standalone = line.match(/^use\s+(\S+)$/);
      if (standalone) results.push(standalone[1].replace(/^\.\//, ''));
      continue;
    }
    if (line === ')') {
      inBlock = false;
      continue;
    }
    if (line) results.push(line.replace(/^\.\//, ''));
  }

  return results.length > 0 ? results : null;
}

export async function readUvWorkspace(projectRoot: string): Promise<string[] | null> {
  const content = await readPyprojectToml(projectRoot);
  if (content === null) return null;
  return parseTomlArrayMembers({ content, sectionHeader: 'tool.uv.workspace', key: 'members' });
}

export async function readPoetryWorkspace(projectRoot: string): Promise<string[] | null> {
  const content = await readPyprojectToml(projectRoot);
  if (content === null) return null;
  return parsePoetryPackages(content);
}

function parsePoetryPackages(content: string): string[] | null {
  const lines = content.split(/\r?\n/);
  const results: string[] = [];
  let inSection = false;
  let inArray = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.replace(/#.*$/, '').trim();
    if (!inSection) {
      if (/^\[tool\.poetry\]\s*$/.test(trimmed)) inSection = true;
      continue;
    }
    if (trimmed.startsWith("[") && !inArray) {
      inSection = false;
      continue;
    }
    if (!inArray) {
      if (/^packages\s*=\s*\[/.test(trimmed)) {
        inArray = true;
        const afterBracket = trimmed.replace(/^[^[]*\[/, '');
        extractIncludeValues(afterBracket, results);
        if (afterBracket.includes(']')) break;
      }
      continue;
    }
    if (trimmed.includes(']')) {
      extractIncludeValues(trimmed.replace(/].*$/, ''), results);
      break;
    }
    extractIncludeValues(trimmed, results);
  }

  return results.length > 0 ? results : null;
}

export async function readDotnetSolution(projectRoot: string): Promise<string[] | null> {
  const entries = await readdir(projectRoot).catch(() => [] as string[]);
  const slnFile = entries.find((entry) => entry.endsWith('.sln'));
  if (!slnFile) return null;
  const content = await readFile(join(projectRoot, slnFile), 'utf-8');
  return parseDotnetSolution(content);
}

function parseDotnetSolution(content: string): string[] | null {
  const re = /^Project\("[^"\n\r]*"\)\s*=\s*"[^"\n\r]*",\s*"([^"\n\r]*\.csproj)"/gm;
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const normalized = match[1].replace(/\\/g, '/');
    const dirname = posix.dirname(normalized).replace(/^\.\//, '');
    if (dirname && dirname !== '.') {
      results.push(dirname);
    }
  }
  return results.length > 0 ? results : null;
}

export async function readCmakeSubdirs(projectRoot: string): Promise<string[] | null> {
  const file = join(projectRoot, 'CMakeLists.txt');
  if (!(await fileExists(file))) return null;
  const content = await readFile(file, 'utf-8');
  return parseCmakeSubdirs(content);
}

function parseCmakeSubdirs(content: string): string[] | null {
  const re = /^\s*add_subdirectory\(\s*([^)\s]+)\s*\)/;
  const results: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trimStart();
    if (trimmed.startsWith('#')) continue;
    const match = trimmed.match(re);
    if (match) results.push(match[1]);
  }

  return results.length > 0 ? results : null;
}
