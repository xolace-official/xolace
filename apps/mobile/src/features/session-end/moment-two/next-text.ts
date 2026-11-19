import { COPY } from "../copy";
import type { ListenerCard } from "../session-end-data";
import type { NextKey } from "../session-end-model";

/** The card's title and sub for a key; null while loading or empty. */
export function nextText(
	k: NextKey,
	listener: ListenerCard | null
): { title: string; sub: string } | null {
	if (k === "listener" && listener) {
		return {
			sub: COPY.next.listener.sub,
			title: COPY.next.listener.title(listener.name, listener.listensTo),
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
