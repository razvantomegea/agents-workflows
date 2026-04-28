import type { MergeFunction } from '../write-file.js';
import { mergeManagedTail } from '../managed-sentinel.js';

export const mergeWindsurfRule: MergeFunction = mergeManagedTail;
