import { useEffect, useRef, useState } from "react";
import type { FieldControl } from "@/features/vent/field/field-control";
import type { VentBackend } from "@/features/vent/vent-backend";
import { ceilingPlan } from "@/features/vent/vent-model";

/**
 * While it listens (§5, §6): the field follows the voice toward the ceiling, the line under the
 * mic changes 10 s before it (with one gentle haptic), and at the ceiling it lets go on its own,
 * with no timer on screen. Timed from what has been recorded, so a Plus entitlement that resolves
 * mid-take moves the ceiling without restarting the count (production). Returns whether the last
 * 10 s have begun.
 */
export function useListening(
	listening: boolean,
	backend: VentBackend,
	field: FieldControl,
	onCeiling: () => void,
	onSoon: () => void
): boolean {
	const [soon, setSoon] = useState(false);
	const handlers = useRef({ onCeiling, onSoon });
	useEffect(() => {
		handlers.current = { onCeiling, onSoon };
	});
	const { ceilingMs } = backend.state;
	const { recordedMs } = backend.actions;

	useEffect(() => {
		// Once it has let go the line keeps its words while it fades.
		if (!listening) {
			return;
		}
		const recorded = recordedMs();
		const plan = ceilingPlan(ceilingMs, recorded);
		field.go("rec", { ceilMs: ceilingMs, recOff: recorded });
		setSoon(plan.soonNow);
		const timers: ReturnType<typeof setTimeout>[] = [];
		if (plan.soonIn !== null) {
			timers.push(
				setTimeout(() => {
					setSoon(true);
					handlers.current.onSoon();
				}, plan.soonIn)
			);
		}
		timers.push(setTimeout(() => handlers.current.onCeiling(), plan.releaseIn));
		return () => {
			for (const t of timers) {
				clearTimeout(t);
			}
		};
		// A new take or a new ceiling re-plans; the field and the reader are stable.
	}, [listening, ceilingMs]);

	return soon;
}
