import { useEffect, useRef, useState } from "react";
import type { FieldControl } from "@/features/vent/field/field-control";
import type { VentBackend } from "@/features/vent/vent-backend";
import { ceilingPlan } from "@/features/vent/vent-model";

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
