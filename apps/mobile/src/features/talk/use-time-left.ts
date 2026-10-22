// The talk's time left (#597), counted down from what the server said at start.
// Display only: the server's clock ends the talk, never this one.
import { useEffect, useState } from "react";

const stepsLeft = (endsAt: number, stepMs: number) =>
	Math.max(0, Math.ceil((endsAt - Date.now()) / stepMs));

/** Whole `stepMs` steps left, rounded up; it only re-renders when that number changes. */
export function useTimeLeft(
	endsAt: number | null,
	stepMs: number
): number | null {
	// Keyed on `endsAt`, so a new talk never shows the last one's count.
	const [left, setLeft] = useState<{ endsAt: number; steps: number } | null>(
		null
	);
	useEffect(() => {
		if (endsAt === null) {
			return;
		}
		const tick = () =>
			setLeft((prev) => {
				const steps = stepsLeft(endsAt, stepMs);
				return prev?.endsAt === endsAt && prev.steps === steps
					? prev
					: { endsAt, steps };
			});
		const first = setTimeout(tick, 0);
		const id = setInterval(tick, 1000);
		return () => {
			clearTimeout(first);
			clearInterval(id);
		};
	}, [endsAt, stepMs]);
	return endsAt !== null && left?.endsAt === endsAt ? left.steps : null;
}
