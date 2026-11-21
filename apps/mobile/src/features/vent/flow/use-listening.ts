import { useEffect, useEffectEvent, useState } from "react";
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
	const { ceilingMs } = backend.state;
	const { recordedMs } = backend.actions;

	const plan = useEffectEvent((ceiling: number) => {
		const recorded = recordedMs();
		field.go("rec", { ceilMs: ceiling, recOff: recorded });
		return ceilingPlan(ceiling, recorded);
	});
	const nearCeiling = useEffectEvent(() => {
		setSoon(true);
		onSoon();
	});
	const atCeiling = useEffectEvent(onCeiling);

	// A new take or a new ceiling re-plans.
	useEffect(() => {
		if (!listening) {
			return;
		}
		const { soonNow, soonIn, releaseIn } = plan(ceilingMs);
		setSoon(soonNow);
		const timers: ReturnType<typeof setTimeout>[] = [];
		if (soonIn !== null) {
			timers.push(setTimeout(nearCeiling, soonIn));
		}
		timers.push(setTimeout(atCeiling, releaseIn));
		return () => {
			for (const t of timers) {
				clearTimeout(t);
			}
		};
	}, [listening, ceilingMs]);

	return soon;
}
