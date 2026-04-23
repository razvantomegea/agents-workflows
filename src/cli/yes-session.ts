import { configureWriteSession, resetWriteSession } from '../generator/index.js';

export async function withYesSession<T>(yes: boolean, fn: () => Promise<T>): Promise<T> {
  if (yes) configureWriteSession({ stickyAll: true });
  try {
    return await fn();
  } finally {
    if (yes) resetWriteSession();
  }
}
