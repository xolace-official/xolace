import { useState } from "react";
import { useAppStore } from "@/src/store/store";
import type { UserVariant } from "@/src/features/reflect/types";
import type { QuietReturnTier } from "@/src/features/reflect/quiet-return-copy";
import type { ReturnWelcomeTier } from "@/src/features/reflect/return-welcome-copy";

type Args = {
  /** Gate: true only once loaded and sitting on the idle canvas. */
  active: boolean;
  variant: UserVariant;
  quietReturn: QuietReturnTier | null;
  /** Timestamp of the user's last completed session — keys the "episode". */
  lastSessionAt?: number;
};

type Result = {
  isOpen: boolean;
  tier: ReturnWelcomeTier;
  dismiss: () => void;
  /**
   * True while this greeting owns the stage — from the moment it becomes
   * eligible until it is dismissed. Other auto-presenting sheets on the home
   * screen (e.g. the monthly awareness event) gate on `!blocking` so they wait
   * their turn instead of stacking. `eligible` is true synchronously on the
   * first render, so there's no one-frame window where another sheet sneaks in.
   */
  blocking: boolean;
};

/**
 * Decides whether the Return Welcome sheet should greet a lapsed user, and with
 * which tier of copy. Shows once per return *episode*: the greeting is keyed to
 * `lastSessionAt`, so re-opening the app during the same gap won't re-trigger
 * it, but a future lapse (which advances `lastSessionAt`) will.
 *
 * Tier resolution mirrors the header: a meaningful gap (14d+ / anniversary)
 * uses its quiet-return tier; a shorter lapse falls back to "recent".
 *
 * State is adjusted during render (not via effect) — same one-shot pattern as
 * the space-name dialog in reflect-screen.
 */
export function useReturnWelcome({
  active,
  variant,
  quietReturn,
  lastSessionAt,
}: Args): Result {
  const seenAt = useAppStore((s) => s.returnWelcomeSeenAt);
  const setSeenAt = useAppStore((s) => s.setReturnWelcomeSeenAt);

  const [open, setOpen] = useState(false);
  const [fired, setFired] = useState(false);

  const tier: ReturnWelcomeTier = quietReturn ?? "recent";

  const eligible =
    active &&
    variant.kind === "returning" &&
    !!lastSessionAt &&
    lastSessionAt !== seenAt;

  if (eligible && !fired) {
    setFired(true);
    setOpen(true);
  }

  const dismiss = () => {
    setOpen(false);
    if (lastSessionAt) setSeenAt(lastSessionAt);
  };

  return { isOpen: open, tier, dismiss, blocking: eligible || open };
}
