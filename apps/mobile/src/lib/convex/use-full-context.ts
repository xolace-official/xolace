import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AppState } from "react-native";

function localDay(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function useLocalDay(): string {
	const [day, setDay] = useState(localDay);
	useEffect(() => {
		const next = new Date();
		next.setHours(24, 0, 1, 0);
		const timer = setTimeout(
			() => setDay(localDay()),
			next.getTime() - Date.now()
		);
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				setDay(localDay());
			}
		});
		return () => {
			clearTimeout(timer);
			sub.remove();
		};
	}, [day]);
	return day;
}

export function useFullContext(skip = false) {
	const day = useLocalDay();
	const result = useQuery(api.users.getFullContext, skip ? "skip" : { day });
	const [held, setHeld] = useState(result);
	const next = skip ? undefined : (result ?? held);
	if (next !== held) {
		setHeld(next);
	}
	return next;
}
