// The talk as one thread (#593): spoken and typed turns from both sides. The
// companion's words land as they are spoken, from the audio's timings; its
// full text settles the turn once the audio has gone quiet.
import { useEffect, useRef, useState } from "react";
import {
	type Alignment,
	spokenWords,
	type TagState,
	withoutTags,
} from "@/src/features/talk/spoken-words";

export type Turn = {
	id: number;
	speaker: "companion" | "person";
	via: "voice" | "text";
	text: string;
	/** The companion is still speaking it. */
	live?: boolean;
};

/** A stored line: the thread a reopening opens on (#604). */
export type ThreadLine = { role: "person" | "companion"; text: string };

type Timer = ReturnType<typeof setTimeout>;
type LiveTurn = {
	id: number;
	timers: Timer[];
	/** When the last audio chunk so far finishes playing. */
	playhead: number;
	final: string | null;
	/** Shown whole (no timings came in time); later audio only extends playhead. */
	whole: boolean;
	/** Where this turn's chunks are, tag-wise, so a split tag still goes. */
	tags: TagState;
};

// No audio timings this long after the companion's text: show the text whole.
const NO_ALIGNMENT_MS = 1500;
// Quiet this long after the last chunk means the turn is over (chunks can gap).
const SETTLE_MS = 800;
// The companion's text arriving this soon after being cut off is the unspoken rest.
const AFTER_INTERRUPT_MS = 2000;

// Stored lines don't say how they were said: no "spoken" tag.
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

	/** Ends the companion's turn, on `text` or on what was spoken so far. */
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
	/** Closes the turn once its text is in and no audio has followed for a while. */
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
		// The person's turns never cut the companion's bubble short; only an
		// interruption does.
		heard: (text: string) =>
			void add({ speaker: "person", text, via: "voice" }),
		/** The person spoke over the companion: keep only what was said. */
		interrupted() {
			interruptedAt.current = Date.now();
			close();
		},
		/** The companion's full text for the turn it is speaking. */
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
		/** An audio chunk from the companion: reveal its words as they play. */
		spoken(a: Alignment) {
			const l = open();
			const now = Date.now();
			const base = Math.max(now, l.playhead);
			// The playhead follows the whole chunk: a tag takes audio time too.
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
