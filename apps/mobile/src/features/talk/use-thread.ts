import { useEffect, useRef, useState } from "react";
import {
	type Alignment,
	spokenWords,
	type TagState,
	withoutTags,
} from "@/features/talk/spoken-words";

export type Turn = {
	id: number;
	speaker: "companion" | "person";
	via: "voice" | "text";
	text: string;
	live?: boolean;
};

export type ThreadLine = { role: "person" | "companion"; text: string };

type Timer = ReturnType<typeof setTimeout>;
type LiveTurn = {
	id: number;
	timers: Timer[];
	playhead: number;
	final: string | null;
	whole: boolean;
	tags: TagState;
};

const NO_ALIGNMENT_MS = 1500;
const SETTLE_MS = 800;
const AFTER_INTERRUPT_MS = 2000;

const toTurn = (l: ThreadLine, id: number): Turn => ({
	id,
	speaker: l.role,
	text: l.text,
	via: "text",
});

export function useThread(earlier: ThreadLine[] = []) {
	const [turns, setTurns] = useState<Turn[]>(() => earlier.map(toTurn));
	const nextId = useRef(earlier.length);
	const live = useRef<LiveTurn | null>(null);
	const interruptedAt = useRef(0);

	const add = (turn: Omit<Turn, "id">) => {
		const id = nextId.current++;
		setTurns((ts) => [...ts, { ...turn, id }]);
		return id;
	};
	const patch = (id: number, fn: (t: Turn) => Turn) =>
		setTurns((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

	const close = (text?: string) => {
		const l = live.current;
		if (!l) {
			return;
		}
		live.current = null;
		l.timers.forEach(clearTimeout);
		setTurns((ts) =>
			ts
				.map((t) =>
					t.id === l.id ? { ...t, live: false, text: text ?? t.text } : t
				)
				.filter((t) => t.text.trim() !== "")
		);
	};
	const open = () =>
		(live.current ??= {
			final: null,
			id: add({ live: true, speaker: "companion", text: "", via: "voice" }),
			playhead: 0,
			tags: { inTag: false, space: true },
			timers: [],
			whole: false,
		});
	const settleLater = (l: LiveTurn) => {
		const at = Math.max(Date.now(), l.playhead) + SETTLE_MS;
		l.timers.push(
			setTimeout(() => {
				if (
					live.current === l &&
					l.final !== null &&
					Date.now() >= l.playhead + SETTLE_MS
				) {
					close(l.final);
				}
			}, at - Date.now())
		);
	};

	useEffect(() => () => live.current?.timers.forEach(clearTimeout), []);

	return {
		heard: (text: string) =>
			void add({ speaker: "person", text, via: "voice" }),
		interrupted() {
			interruptedAt.current = Date.now();
			close();
		},
		said(text: string) {
			if (live.current?.final != null) {
				close(live.current.final);
			}
			if (
				!live.current &&
				Date.now() - interruptedAt.current < AFTER_INTERRUPT_MS
			) {
				return;
			}
			const l = open();
			l.final = text;
			if (l.playhead === 0) {
				l.timers.push(
					setTimeout(() => {
						if (live.current !== l || l.playhead !== 0) {
							return;
						}
						l.whole = true;
						patch(l.id, (t) => ({ ...t, text }));
						settleLater(l);
					}, NO_ALIGNMENT_MS)
				);
			} else {
				settleLater(l);
			}
		},
		spoken(a: Alignment) {
			const l = open();
			const now = Date.now();
			const base = Math.max(now, l.playhead);
			l.playhead = spokenWords(a, base).end;
			const { words } = spokenWords(withoutTags(a, l.tags), base);
			if (!l.whole) {
				for (const w of words) {
					l.timers.push(
						setTimeout(
							() => patch(l.id, (t) => ({ ...t, text: t.text + w.text })),
							w.at - now
						)
					);
				}
			}
			settleLater(l);
		},
		turns,
		typed: (text: string) => void add({ speaker: "person", text, via: "text" }),
	};
}
