// Base fallback: use localStorage (safe when AsyncStorage native module unavailable)
// Platform-specific: storage.web.ts and storage.native.ts override for web/native
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};
