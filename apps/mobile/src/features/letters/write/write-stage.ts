import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard } from "react-native";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { LETTER_MOTION } from "../letter-motion";
import {
	afterAnswer,
	type Draft,
	type SendAnswer,
	type WriteLimit,
	type WriteStage,
	waitLeft,
} from "../letters-model";
import type { WriteOpens } from "./write-data";

const M = LETTER_MOTION;

/**
 * The writing screen's moves (handoff §3, §5): Send folds the letter while the check reads it;
 * then it rises ("It's on its way." at +2 s), comes back with one line (fixable, held, not
 * English), rests while care rises (at risk), or says the limit (`afterAnswer`). Leaving
 * mid-check stops the moves; the words stay on the device, and the check stays one at a time
 * (`useCheckRunning`).
 */
export function useWriteStage({
	opens,
	reduced,
	text,
	send,
}: {
	opens: WriteOpens;
	reduced: boolean;
	text: string;
	send: (draft: Draft) => Promise<SendAnswer>;
}) {
	const [stage, setStage] = useState<WriteStage>(opens.stage);
	const [line, setLine] = useState<string | null>(opens.line);
	const [care, setCare] = useState(opens.care);
	const [limit, setLimit] = useState<WriteLimit | null>(null);
	// The words on the folding paper: what Send took, so the field can clear behind it.
	const [paper, setPaper] = useState(text);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const alive = useRef(true);
	const later = (ms: number, fn: () => void) => {
		timers.current.push(setTimeout(fn, ms));
	};
	useEffect(() => {
		alive.current = true;
		const list = timers.current;
		return () => {
			alive.current = false;
			for (const t of list) {
				clearTimeout(t);
			}
		};
	}, []);

	const ms = (full: number) => (reduced ? M.reducedMs : full);
	const unfold = (then: () => void) => {
		setStage("back");
		later(ms(M.back.editAtMs), () => {
			setStage("edit");
			then();
		});
	};

	const play = (answer: SendAnswer) => {
		const moves = afterAnswer(answer, reduced, M);
		setStage(moves.stage);
		if (moves.limit) {
			setLimit(moves.limit);
		}
		if (moves.hapticMs !== null) {
			later(moves.hapticMs, playSoftPress);
		}
		const say = () => {
			if (moves.announce) {
				AccessibilityInfo.announceForAccessibility(moves.announce);
			}
		};
		const next = moves.next;
		if (!next) {
			say();
			return;
		}
		later(next.ms, () => {
			setStage(next.stage);
			setLine(next.line);
			if (next.care) {
				setCare(true);
			}
			say();
		});
	};

	const start = (draft: Draft) => {
		Keyboard.dismiss();
		playAffirmativePress();
		setPaper(draft.text);
		setLine(null);
		setStage("wait");
		const began = Date.now();
		send(draft).then((answer) => {
			if (alive.current) {
				later(waitLeft(Date.now() - began, reduced), () => play(answer));
			}
		});
	};

	const closeCare = () => {
		setCare(false);
		unfold(() => undefined);
	};

	return { care, closeCare, limit, line, paper, stage, start };
}
