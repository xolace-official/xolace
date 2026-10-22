import { createContext } from "react";

import type { SharedValue } from "react-native-reanimated";

/**
 * Typed registry of tray screens. Each key is a screen name; each value is a
 * render function that may take a single props argument.
 */
export type TrayScreens<
  T extends Record<string, (props?: any) => React.ReactElement>,
> = T;

export type TrayRef = {
  isActive: () => boolean;
  close: () => void;
  open: () => void;
};

export type TrayState<
  T extends Record<string, (props?: any) => React.ReactElement>,
> = {
  currentScreen: keyof T | null;
  screenHistory: (keyof T)[];
  screenProps: { [K in keyof T]?: Parameters<T[K]>[number] };
  isActive: SharedValue<boolean>;
};

export type TrayActions<
  T extends Record<string, (props?: any) => React.ReactElement>,
> = {
  show: <K extends keyof T>(
    screenKey: K,
    props?: Parameters<T[K]>[number],
  ) => void;
  dismiss: () => void;
  goBack: () => void;
};

export type TrayMeta = {
  trayRef: React.RefObject<TrayRef | null>;
};

export type TrayContextProps<
  T extends Record<string, (props?: any) => React.ReactElement>,
> = {
  state: TrayState<T>;
  actions: TrayActions<T>;
  meta: TrayMeta;
};

export const TrayContext = createContext<TrayContextProps<any>>({
  state: {
    currentScreen: null,
    screenHistory: [],
    screenProps: {},
    isActive: { value: false } as SharedValue<boolean>,
  },
  actions: {
    show: () => undefined,
    dismiss: () => undefined,
    goBack: () => undefined,
  },
  meta: {
    trayRef: { current: null },
  },
});
