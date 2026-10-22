import { useState } from "react";
import { resolveCardContent } from "@/src/features/reflect/compose/resolve-card-content";
import type { QuietReturnTier } from "@/src/features/reflect/quiet-return-copy";
import { useAppStore } from "@/src/store/store";

const NUDGE_MESSAGES = [
  "There's no rush. Let it come.",
  "Even a few words are enough.",
  "You don't need to explain, just say what's there.",
];

type Args = {
  isNight: boolean;
  quietReturn: QuietReturnTier | null;
  expanded: boolean;
  entryText: string;
};

/** What the card says, and the event prompt the surround says it with. */
export const useComposeCard = ({
  isNight,
  quietReturn,
  expanded,
  entryText,
}: Args) => {
  const pendingEventPrompt = useAppStore((s) => s.pendingEventPrompt);
  const replySeed = useAppStore((s) => s.replySeed);
  // Read the clock once at mount (lazy init keeps the call out of the render
  // body so React Compiler can still optimize this). The prompt has a
  // multi-day expiry, so mount-time accuracy is sufficient.
  const [now] = useState(() => Date.now());
  const eventPromptActive =
    !!pendingEventPrompt && pendingEventPrompt.expiresAt > now;
  const eventPrompt = eventPromptActive ? pendingEventPrompt.text : null;
  const eventLabel = eventPromptActive
    ? (pendingEventPrompt.label ?? null)
    : null;

  // An entry's prompt (#413) was asked for just now, so it outranks what the
  // space would say at night or on a quiet return.
  const fromEntry = eventPromptActive && !!pendingEventPrompt.fromEntryId;

  const card = resolveCardContent({
    isNight: isNight && !fromEntry,
    quietReturnTier: !isNight && !fromEntry ? quietReturn : null,
    eventPrompt,
    // Dismissing the composer keeps the writing (#258), so the resting card
    // shows the draft's opening line rather than a prompt over the top of it.
    // Only at rest: open, the line is the card's own voice above what you are
    // writing, and swapping it for your own first line as you type would make
    // the composer echo you back at yourself.
    draft: expanded ? null : entryText,
    replySeed,
  });

  const [nudgeMessage] = useState(
    () => NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)],
  );

  return { card, nudgeMessage, eventPrompt, eventLabel };
};
