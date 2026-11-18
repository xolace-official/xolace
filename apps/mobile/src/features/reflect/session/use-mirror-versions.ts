import type { Id } from "@xolace/backend/dataModel";
import { useState } from "react";

/**
 * The first mirror and the latest refinement of it. The server keeps only the latest, so the
 * first is remembered here as it lands; a session picked up cold after a refinement shows the
 * latest alone. `landN` counts each mirror that writes in, `mv` which version shows.
 */
export function useMirrorVersions(
	sessionId: Id<"sessions"> | null,
	mirrorText: string | null,
	turns: number
) {
	const [first, setFirst] = useState<{ id: string; text: string } | null>(null);
	if (
		sessionId &&
		mirrorText &&
		turns === 0 &&
		(first?.id !== sessionId || first.text !== mirrorText)
	) {
		setFirst({ id: sessionId, text: mirrorText });
	}
	const firstText =
		first && first.id === sessionId ? first.text : (mirrorText ?? "");
	const revisedText =
		turns > 0 && mirrorText && mirrorText !== firstText ? mirrorText : null;

	const [landed, setLanded] = useState({ n: 0, text: mirrorText });
	if (mirrorText && mirrorText !== landed.text) {
		setLanded({ n: landed.n + 1, text: mirrorText });
	}

	const [pick, setPick] = useState<{ for: string | null; mv: 1 | 2 }>({
		for: null,
		mv: 1,
	});
	const fallback: 1 | 2 = revisedText ? 2 : 1;
	const mv = revisedText && pick.for === revisedText ? pick.mv : fallback;

	return {
		firstText,
		landN: landed.n,
		mv,
		revisedText,
		setVersion: (next: 1 | 2) => setPick({ for: revisedText, mv: next }),
	};
}
