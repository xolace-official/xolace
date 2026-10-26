"use client";

import { useEffect, useState } from "react";

/** Matches `linkWindow` in packages/backend/convex/admin/uploads.ts. */
const LINK_WINDOW_MS = 30 * 60 * 1000;

const windowAt = (now: number) => Math.floor(now / LINK_WINDOW_MS);

/**
 * The current preview-link window, passed to every query that signs R2 links.
 * It moves on at each boundary, so the query re-runs and its links never go
 * stale, even from Convex's cache or in an editor left open.
 */
export function useLinkWindow() {
	const [current, setCurrent] = useState(() => windowAt(Date.now()));
	useEffect(() => {
		const timer = setTimeout(
			() => setCurrent(windowAt(Date.now())),
			(current + 1) * LINK_WINDOW_MS - Date.now()
		);
		return () => clearTimeout(timer);
	}, [current]);
	return current;
}

/**
 * `result`, or while the next window's query loads, the last one for the same
 * `key`: its links stay valid well past the window's end. Without it a query
 * would go back to loading every 30 minutes, and `StoresReady` would unmount
 * an open editor with its unsaved changes.
 */
export function useHeldLinks<T>(result: T | undefined, key = "") {
	const [held, setHeld] = useState<{ key: string; result: T } | null>(null);
	if (result === undefined) {
		return held !== null && held.key === key ? held.result : undefined;
	}
	if (held === null || held.result !== result || held.key !== key) {
		setHeld({ key, result });
	}
	return result;
}
