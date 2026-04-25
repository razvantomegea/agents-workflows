import { createHash } from 'node:crypto';

export function hashConfig(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
