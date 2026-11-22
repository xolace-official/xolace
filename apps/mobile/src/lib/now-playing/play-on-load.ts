export type PlayStep = "paywall" | "resume" | "nothing" | "load" | "reload";

export function playStep(n: {
	slug: string;
	locked: boolean;
	loaded: string | null;
	mint: "in" | "pending" | "failed";
	playing: boolean;
}): PlayStep {
	if (n.locked) {
		return "paywall";
	}
	if (n.loaded !== n.slug || n.mint === "pending") {
		return "load";
	}
	if (n.mint === "failed") {
		return "reload";
	}
	return n.playing ? "nothing" : "resume";
}

export const mintOf = (p: {
	track: unknown;
	error: unknown;
}): "in" | "pending" | "failed" => {
	if (p.error || p.track === null) {
		return "failed";
	}
	return p.track === undefined ? "pending" : "in";
};

export function armPlayOnLoad(
	pending: string | null,
	next: string,
	play: boolean
): string | null {
	if (play) {
		return next;
	}
	return pending === next ? pending : null;
}

export function takePlayOnLoad(pending: string | null, slug: string) {
	const asked = pending === slug;
	return { asked, pending: asked ? null : pending };
}
