import { createHash } from 'node:crypto';

/**
 * Returns a 16-character hex digest of the SHA-256 hash of a JSON string.
 *
 * @param json - Serialised JSON string to hash; typically `JSON.stringify(stackConfig)`.
 * @returns A 16-character lowercase hex string (first 64 bits of SHA-256).
 */
export function hashConfig(json: string): string {
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}
