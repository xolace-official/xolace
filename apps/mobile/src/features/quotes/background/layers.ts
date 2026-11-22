import type { QuoteBackground } from "../quotes-model";

/**
 * One background drawn behind the words. `id` is its React key, so a layer keeps its instance,
 * and its loop's one player, for as long as it's drawn: a reveal settles by dropping what it
 * covered, never by drawing the revealed background again underneath (#910 follow-up).
 * `revealed` layers grew in over another and stay in their reveal's clip, opened.
 */
export type Layer = {
	id: number;
	background: QuoteBackground;
	revealed: boolean;
};

export const firstLayers = (background: QuoteBackground): readonly Layer[] => [
	{ background, id: 0, revealed: false },
];

/**
 * The layers once `background` is what should show. A pick grows in over what's drawn. Until
 * the server has answered (`known`), a change corrects the guess remembered on the phone
 * instead: swapped in place under the arrival's fade, no reveal over the words.
 */
export function layersFor(
	layers: readonly Layer[],
	background: QuoteBackground,
	known: boolean
): readonly Layer[] {
	const top = layers.at(-1);
	if (top?.background.key === background.key) {
		return layers;
	}
	const id = (top?.id ?? 0) + 1;
	return known
		? [...layers, { background, id, revealed: true }]
		: [{ background, id, revealed: false }];
}

/** Layer `id` has fully revealed: what it covers can go. It stays, with its key. */
export function settled(
	layers: readonly Layer[],
	id: number
): readonly Layer[] {
	const at = layers.findIndex((l) => l.id === id);
	return at <= 0 ? layers : layers.slice(at);
}

/** Only the top layer plays; the ones it covers show their still, so one loop decodes. */
export const plays = (layers: readonly Layer[], i: number, play: boolean) =>
	play && i === layers.length - 1;
