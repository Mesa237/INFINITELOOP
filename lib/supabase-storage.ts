// Fallback storage implementation for environments where platform-specific
// files (.web.ts / .native.ts) are not resolved (e.g. plain Node / tsc).
// On web, Metro resolves supabase-storage.web.ts automatically.
// On native, Metro resolves supabase-storage.native.ts automatically.

function getSafeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const supabaseStorage = {
  getItem(key: string): string | null {
    return getSafeStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    getSafeStorage()?.setItem(key, value);
  },
  removeItem(key: string): void {
    getSafeStorage()?.removeItem(key);
  },
};
