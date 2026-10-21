import type { Href } from "expo-router";
import type { SymbolViewProps } from "expo-symbols";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type Kindling = NonNullable<FunctionReturnType<typeof api.paths.getActive>>;
export type Twig = Kindling["twigs"][number];

/**
 * How each twig family reads on the card and the rail (docs/paths-v1.md
 * §9.1). Audio and music take the bound track's title when the server could
 * resolve one; the fallback covers a retired track.
 */
export const TWIG_PRESENTATION: Record<
  Twig["kind"],
  {
    symbol: SymbolViewProps["name"];
    eyebrow: string;
    title: string;
    actionLabel: string;
    image: string;
  }
> = {
  breathing: {
    symbol: { ios: "wind", android: "air", web: "air" },
    eyebrow: "A few minutes",
    title: "Sit with this",
    actionLabel: "Begin",
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/6d4d937e-8dd9-4e8d-bbd6-3ee58b538988",
  },
  audio: {
    symbol: { ios: "waveform", android: "graphic_eq", web: "graphic_eq" },
    eyebrow: "Something to hear",
    title: "A voice for this",
    actionLabel: "Play",
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/be99df4e-7738-4cf8-9384-8cabae5a476e",
  },
  music: {
    symbol: { ios: "music.note", android: "music_note", web: "music_note" },
    eyebrow: "Something to hear",
    title: "Low sound for the quiet",
    actionLabel: "Play",
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/91ae3a04-e554-431a-b2e0-e4c46191cf76",
  },
  xolacer: {
    symbol: { ios: "person.2", android: "group", web: "group" },
    eyebrow: "When you want it",
    title: "Someone who has been here",
    actionLabel: "See who",
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/6642efe2-7add-4a87-91d8-70f547ada414",
  },
  read: {
    symbol: { ios: "book", android: "menu_book", web: "menu_book" },
    eyebrow: "Something to read",
    title: "A few pages for this",
    actionLabel: "Read",
    // Borrows breathing's until read has an image of its own.
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/6d4d937e-8dd9-4e8d-bbd6-3ee58b538988",
  },
  bridge: {
    symbol: { ios: "envelope", android: "mail", web: "mail" },
    eyebrow: "When you're ready",
    title: "Tell someone you trust",
    actionLabel: "Write",
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/8f7dc3c4-9caa-4744-b3bf-2393b572a1e9",
  },
  // Off-app (#567): no screen to hand off to, so the action is the person saying they did it.
  try: {
    symbol: { ios: "figure.walk", android: "directions_walk", web: "directions_walk" },
    eyebrow: "Away from the app",
    title: "Something to try",
    actionLabel: "I did this",
    // Borrows breathing's until try-this has an image of its own.
    image: "https://energetic-guineapig-283.convex.cloud/api/storage/6d4d937e-8dd9-4e8d-bbd6-3ee58b538988",
  },
};

/**
 * "Browse more like this" (§9.6): a bound audio/music twig's topic in Browse,
 * filtered to its family. One-off listening — nothing here carries `stepId`,
 * so plays from it can't tend the twig, and the stored binding is never
 * touched. If the bound track is wrong, "Not for me" is the correction.
 */
export function twigBrowseHref(twig: Twig): Href | null {
  const match = /^(audio|music)_topic_(.+)$/.exec(twig.actionType);
  if (!match) return null;
  return {
    pathname: "/browse/topic/[slug]",
    params: {
      slug: match[2],
      family: match[1] === "music" ? "music" : "support",
      from: "twig-more-like-this",
    },
  };
}

/**
 * Where the primary action goes. Every twig hands off to a screen of its own
 * (the person is chosen there, the exercise runs there); this screen never
 * plays or runs anything inline.
 *
 * Audio and music go to the one player (#340, `/browse-player`). `stepId`
 * rides along so `useTrackPlayback` tends the twig on a natural finish —
 * a Browse play carries no `stepId` and never completes anything (§9.6).
 */
/** The entry or track a twig points at, if it points at one. */
export const twigSlug = (twig: Twig) => (twig.params as { slug?: string } | null)?.slug;

export function twigHref(twig: Twig, sessionId: Kindling["sessionId"]): Href | null {
  switch (twig.kind) {
    case "audio":
    case "music": {
      const slug = (twig.params as { slug?: string } | null)?.slug;
      if (!slug) return null;
      return { pathname: "/browse-player", params: { slug, stepId: twig._id } };
    }
    case "read": {
      // `stepId` rides along so the reader tends the twig once the entry is finished.
      const slug = twigSlug(twig);
      if (!slug) return null;
      return { pathname: "/library/[slug]", params: { slug, stepId: twig._id, from: "twig" } };
    }
    case "breathing":
      // `stepId` rides along so finishing the exercise tends the twig.
      return {
        pathname: "/sit-with-this",
        params: { from: "kindling", sessionId, stepId: twig._id },
      };
    case "bridge":
      // `stepId` rides along so a completed share tends the twig.
      return {
        pathname: "/trusted-bridge",
        params: { sessionId, stepId: twig._id },
      };
    case "xolacer": {
      // Only the ranker's specialty is stored — never a person (privacy, see
      // `xolacerChat.sessionSuggestion`). The roster filtered to it is where
      // the person gets picked.
      const specialty = (twig.params as { specialty?: string } | null)?.specialty;
      // `t` makes a repeat tap re-apply the filter even when nothing else changed.
      // `stepId` rides along to the profile so a sent request tends the twig.
      return {
        pathname: "/connect",
        params: { t: String(Date.now()), stepId: twig._id, ...(specialty ? { specialty } : {}) },
      };
    }
    default:
      return null;
  }
}
