import { useSyncExternalStore } from 'react';

/**
 * Whether the native tab bar is hidden right now.
 *
 * A module-level store rather than context: the only writer is a screen deep
 * inside a tab, the only reader is the navigator above every tab, and threading
 * a provider between them would re-render every tab's content to move one bar.
 *
 * Hiding it is what makes a bottom `Stack.Toolbar` usable — the toolbar and the
 * floating tab bar occupy the same strip, so an action sheet raised over the
 * tab bar has its buttons sitting either side of the tab pill, and any of them
 * under the pill cannot be tapped at all.
 */
let hidden = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return hidden;
}

export function setTabBarHidden(nextHidden: boolean) {
  if (hidden === nextHidden) return;
  hidden = nextHidden;
  listeners.forEach((listener) => listener());
}

export function useTabBarHidden() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
