import { useEffect } from "react";
import { useGoneStore } from "./gone-store";

/**
 * Lives as long as someone is signed in (a root host): leaving the protected
 * tree on sign-out clears the reflections put away, so the next account on the
 * device doesn't inherit them. Renders nothing.
 */
export function GoneHost() {
	const clear = useGoneStore((s) => s.clear);
	useEffect(() => clear, [clear]);
	return null;
}
