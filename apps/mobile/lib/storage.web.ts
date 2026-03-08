// Web: use localStorage (AsyncStorage's native module doesn't exist on web)
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
      // Ignore quota exceeded, etc.
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
