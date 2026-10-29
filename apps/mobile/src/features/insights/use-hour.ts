import { useEffect, useState } from "react";

const HOUR = 60 * 60 * 1000;
const hour = () => Math.floor(Date.now() / HOUR) * HOUR;

/** The current hour, ticking over on the hour; passed to insights queries as `now`, since
 * Convex never reruns a query as time passes. */
export function useHour() {
	const [now, setNow] = useState(hour);
	useEffect(() => {
		const id = setTimeout(() => setNow(hour()), now + HOUR - Date.now());
		return () => clearTimeout(id);
	}, [now]);
	return now;
}
