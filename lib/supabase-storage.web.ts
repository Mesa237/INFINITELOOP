function getBrowserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const supabaseStorage = {
  getItem(key: string) {
    return getBrowserStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string) {
    getBrowserStorage()?.setItem(key, value);
  },
  removeItem(key: string) {
    getBrowserStorage()?.removeItem(key);
  },
};
