type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

/**
 * Keys controlled by the generator; incoming value wins for these keys.
 * Extend this array as new managed keys are identified.
 */
export const MANAGED_JSON_KEYS: readonly string[] = [];

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitiveArray(arr: JsonArray): arr is JsonPrimitive[] {
  return arr.every(
    (item) => item === null || typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
  );
}

function isObjectArray(arr: JsonArray): arr is JsonObject[] {
  return arr.every((item) => isJsonObject(item));
}

function sortKeys(value: JsonValue): JsonValue {
  if (!isJsonObject(value)) {
    if (Array.isArray(value)) {
      return (value as JsonArray).map(sortKeys);
    }
    return value;
  }
  const sorted = Object.create(null) as JsonObject;
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeys(value[key]);
  }
  return sorted;
}

function unionPrimitiveArrays(existing: JsonPrimitive[], incoming: JsonPrimitive[]): JsonPrimitive[] {
  const seen = new Set<string>();
  const result: JsonPrimitive[] = [];
  for (const item of [...existing, ...incoming]) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function unionObjectArrays(existing: JsonObject[], incoming: JsonObject[]): JsonObject[] {
  const seen = new Set<string>(existing.map((item) => JSON.stringify(sortKeys(item))));
  const result: JsonObject[] = [...existing];
  for (const item of incoming) {
    const key = JSON.stringify(sortKeys(item));
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function unionMixedArrays(existing: JsonArray, incoming: JsonArray): JsonArray {
  const seen = new Set<string>(existing.map((item) => JSON.stringify(sortKeys(item))));
  const result: JsonArray = [...existing];
  for (const item of incoming) {
    const key = JSON.stringify(sortKeys(item));
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function mergeArrays(existing: JsonArray, incoming: JsonArray): JsonArray {
  if (isPrimitiveArray(existing) && isPrimitiveArray(incoming)) {
    return unionPrimitiveArrays(existing, incoming);
  }
  if (isObjectArray(existing) && isObjectArray(incoming)) {
    return unionObjectArrays(existing, incoming);
  }
  return unionMixedArrays(existing, incoming);
}

function deepMerge(existing: JsonValue, incoming: JsonValue, key: string): JsonValue {
  if (isJsonObject(existing) && isJsonObject(incoming)) {
    return mergeObjects(existing, incoming);
  }
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return mergeArrays(existing as JsonArray, incoming as JsonArray);
  }
  // Scalar conflict: user (existing) wins unless key is managed
  if (MANAGED_JSON_KEYS.includes(key)) {
    return incoming;
  }
  return existing;
}

function mergeObjects(existing: JsonObject, incoming: JsonObject): JsonObject {
  const result = Object.create(null) as JsonObject;
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  for (const key of allKeys) {
    const inExisting = Object.prototype.hasOwnProperty.call(existing, key);
    const inIncoming = Object.prototype.hasOwnProperty.call(incoming, key);
    if (inExisting && inIncoming) {
      result[key] = deepMerge(existing[key], incoming[key], key);
    } else if (inExisting) {
      result[key] = existing[key];
    } else {
      result[key] = incoming[key];
    }
  }
  return result;
}

function parseJson({ text, label }: { text: string; label: string }): JsonValue {
  try {
    return JSON.parse(text) as JsonValue;
  } catch (err) {
    throw new Error(`mergeJson: failed to parse ${label} JSON`, { cause: err });
  }
}

export function mergeJson({ existing, incoming, path }: { existing: string; incoming: string; path?: string }): string {
  const pathLabel = path != null ? `"${path}"` : 'unnamed file';

  const existingParsed = parseJson({ text: existing, label: `existing (${pathLabel})` });
  const incomingParsed = parseJson({ text: incoming, label: `incoming (${pathLabel})` });

  let merged: JsonValue;
  if (isJsonObject(existingParsed) && isJsonObject(incomingParsed)) {
    merged = mergeObjects(existingParsed, incomingParsed);
  } else if (Array.isArray(existingParsed) && Array.isArray(incomingParsed)) {
    merged = mergeArrays(existingParsed as JsonArray, incomingParsed as JsonArray);
  } else {
    // Scalar or mismatched top-level types: existing wins.
    merged = existingParsed;
  }

  return JSON.stringify(sortKeys(merged), null, 2);
}
