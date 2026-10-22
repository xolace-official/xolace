/**
 * Unified storage adapter for Zustand's createJSONStorage.
 * Uses localStorage on web and expo-sqlite/kv-store on native.
 *
 * getItem is **synchronous** so Zustand hydrates on the very first render
 * (no blank frame, no _hasHydrated check needed).
 * setItem/removeItem stay async — writes don't block the UI.
 */
import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

const isWeb = typeof window !== 'undefined' && Platform.OS === 'web';

export const zustandJSONStorage = {
  getItem: (name: string): string | null => {
    if (isWeb) {
      return window.localStorage.getItem(name);
    }
    return Storage.getItemSync(name);
  },
  setItem: async (name: string, value: string) => {
    if (isWeb) {
      window.localStorage.setItem(name, value);
    } else {
      await Storage.setItem(name, value);
    }
  },
  removeItem: async (name: string) => {
    if (isWeb) {
      window.localStorage.removeItem(name);
    } else {
      await Storage.removeItem(name);
    }
  },
};