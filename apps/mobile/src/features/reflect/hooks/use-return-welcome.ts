import { useState } from "react";
import type { QuietReturnTier } from "@/features/reflect/quiet-return-copy";
import type { ReturnWelcomeTier } from "@/features/reflect/return-welcome-copy";
import type { UserVariant } from "@/features/reflect/types";
import { useAppStore } from "@/store/store";

type Args = {
	/** True only once loaded and sitting on the idle canvas. */
	active: boolean;
	variant: UserVariant;
	quietReturn: QuietReturnTier | null;
	/** Timestamp of the last completed session; keys the return episode. */
	lastSessionAt?: number;
};

type Result = {
	isOpen: boolean;
	tier: ReturnWelcomeTier;
	dismiss: () => void;
	/**
	 * True from eligibility (synchronously, on first render) until dismissed; other sheets wait.
	 */
	blocking: boolean;
};

/**
 * Whether the Return Welcome sheet greets a lapsed user, and which tier. Once per `lastSessionAt`.
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
		if (lastSessionAt) {
			setSeenAt(lastSessionAt);
		}
	};

	return { blocking: eligible || open, dismiss, isOpen: open, tier };
}
