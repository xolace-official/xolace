import { useEffect, useState } from "react";
import { SAY_MS_PER_CHAR } from "@/features/intake/v2/flux";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** How much of Flux's line has typed out; all of it at once under reduced motion. A new line
 * types out from the start. */
export function useTypedLine(line: string) {
	const reduced = useEffectiveReducedMotion();
	const [shown, setShown] = useState(reduced ? line.length : 0);
	useEffect(() => {
		if (reduced) {
			setShown(line.length);
			return;
		}
		setShown(0);
		const timer = setInterval(() => {
			setShown((n) => {
				if (n + 1 >= line.length) {
					clearInterval(timer);
				}
				return Math.min(n + 1, line.length);
			});
		}, SAY_MS_PER_CHAR);
		return () => clearInterval(timer);
	}, [line, reduced]);
	return { done: shown >= line.length, text: line.slice(0, shown) };
}
