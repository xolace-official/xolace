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
