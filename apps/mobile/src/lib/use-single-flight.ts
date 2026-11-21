import { useState } from "react";
import { createSingleFlight } from "./single-flight";

export function useSingleFlight() {
	const [busy, setBusy] = useState(false);
	const [flight] = useState(() => createSingleFlight(setBusy));
	return { busy, isBusy: () => flight.busy, run: flight.run };
}
