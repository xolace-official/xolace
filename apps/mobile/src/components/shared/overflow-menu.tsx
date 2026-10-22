import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import MoreVert from '@expo/material-symbols/more_vert.xml';

/**
 * The native overflow menu at the header right — the home for per-screen
 * actions that don't earn a permanent affordance (block, report, and whatever
 * the profile screen grows next).
 *
 * Destructive styling on the items is iOS-only; on Android the confirmation
 * dialog carries the weight.
 */
export function OverflowMenu({ children }: { children: ReactNode }) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon={process.env.EXPO_OS === 'ios' ? 'ellipsis' : MoreVert}
        accessibilityLabel="More options"
      >
        {children}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

OverflowMenu.Action = Stack.Toolbar.MenuAction;
