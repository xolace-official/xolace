import { useEffect, useState } from "react";

const stepsLeft = (endsAt: number, stepMs: number) =>
	Math.max(0, Math.ceil((endsAt - Date.now()) / stepMs));

export function useTimeLeft(
	endsAt: number | null,
	stepMs: number
): number | null {
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
