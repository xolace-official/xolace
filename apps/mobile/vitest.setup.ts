/**
 * Loaded by every test file (see vitest.config.ts).
 *
 * react-native's entry point is Flow-typed and unparseable outside Metro, so
 * any unit test that reaches it transitively (e.g. store.ts ->
 * unified-storage.ts) fails to import. Stub the few native modules our
 * pure-logic tests touch.
 */
import { vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
}));

vi.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItemSync: (name: string) => store.get(name) ?? null,
      setItem: async (name: string, value: string) => void store.set(name, value),
      removeItem: async (name: string) => void store.delete(name),
    },
  };
});
