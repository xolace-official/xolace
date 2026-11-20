import { useEffect } from "react";
import { useGoneStore } from "./gone-store";

export function GoneHost() {
	const clear = useGoneStore((s) => s.clear);
	useEffect(() => clear, [clear]);
	return null;
}
