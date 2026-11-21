import { COPY } from "../copy";
import type { ListenerCard, NextCards, NextParts } from "../session-end-data";
import type { NextKey } from "../session-end-model";

const L = COPY.next.listener;

const standingOf = (listener: ListenerCard): string =>
	`${listener.rating === undefined ? L.newXolacer : L.rated(listener.rating)}, ${listener.present ? L.hereNow : L.repliesInADay}`;

export function nextText(
	k: NextKey,
	cards: NextCards,
	partName: NextParts["partName"]
): { title: string; sub: string } | null {
	const { listener, unlock, upsell } = cards;
	if (k === "listener" && listener) {
		return {
			sub: L.sub,
			title: L.title(listener.name, listener.listensTo),
		};
	}
	if (k === "unlock" && unlock?.length) {
		return {
			sub: COPY.next.unlock.sub(unlock.length),
			title: COPY.next.unlock.title(unlock.map(partName)),
		};
	}
	if (k === "upsell" && upsell) {
		return {
			sub: COPY.next.upsell.sub,
			title: COPY.next.upsell.title(partName(upsell)),
		};
	}
	if (
		k === "kindling" ||
		k === "kindlingSettingUp" ||
		k === "kfree" ||
		k === "listen" ||
		k === "letterRead" ||
		k === "letterWrite"
	) {
		return COPY.next[k];
	}
	return null;
}

export function nextLabel(
	k: NextKey,
	cards: NextCards,
	text: { title: string; sub: string } | null
): string {
	if (!text) {
		return COPY.next.loading;
	}
	if (k === "listener" && cards.listener) {
		return `${text.title}. ${standingOf(cards.listener)}. ${text.sub}`;
	}
	return `${text.title}. ${text.sub}`;
}
