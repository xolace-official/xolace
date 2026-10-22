import type { SFSymbol } from "expo-symbols";

export type StarterRowId = "reflect" | "vent" | "lantern" | "listen" | "xolacer";

export type StarterRow = {
  id: StarterRowId;
  title: string;
  subtitle: string;
  icon: { ios: SFSymbol; android: string };
};

/** Default order (CONTEXT.md "Starter suggestions"). Intake reorders it via orderStarterRows (ADR-0017). */
export const STARTER_ROWS: StarterRow[] = [
  {
    id: "reflect",
    title: "Reflect",
    subtitle: "Get clarity on what's on your mind",
    icon: { ios: "square.and.pencil", android: "edit" },
  },
  {
    id: "vent",
    title: "Vent",
    subtitle: "Say it out loud",
    icon: { ios: "mic", android: "mic" },
  },
  {
    id: "lantern",
    title: "Lantern",
    subtitle: "Read something that fits",
    icon: { ios: "book", android: "menu_book" },
  },
  {
    id: "listen",
    title: "Listen",
    subtitle: "Music and support audio",
    icon: { ios: "headphones", android: "headphones" },
  },
  {
    id: "xolacer",
    title: "Xolacer chat",
    subtitle: "Talk with someone who's been there",
    icon: { ios: "bubble.left.and.bubble.right", android: "forum" },
  },
];
