import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard } from "react-native";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { LETTERS } from "../copy";
import { LETTER_MOTION } from "../letter-motion";
import type { Draft, SendAnswer, WriteLimit } from "../letters-model";
import type { WriteOpens, WriteStage } from "./write-data";

const M = LETTER_MOTION;
/** The wait never ends before the fold and the glow's first rise have played (the board's floor). */
const MIN_WAIT = { full: 1400, reduced: 400 };

/**
 * The writing screen's moves (handoff §3, §5): Send folds the letter while the check reads it;
 * then it rises ("It's on its way." at +2 s), comes back with one line (fixable, held, not
 * English), rests while care rises (at risk), or says the limit. Leaving mid-check stops the
 * moves; the words stay on the device.
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
		switch (answer.next) {
			case "rise":
				setStage("rise");
				later(reduced ? 0 : M.send.rise.delayMs, playSoftPress);
				later(ms(M.send.lineAtMs), () => {
					setStage("sent");
					AccessibilityInfo.announceForAccessibility(LETTERS.sent.title);
				});
				return;
			case "care":
				setStage("rest");
				later(ms(M.risk.sheetAtMs), () => setCare(true));
				return;
			case "limit":
				setStage("edit");
				setLimit(answer.reason);
				return;
			default:
				unfold(() => {
					setLine(answer.line || null);
					if (answer.line) {
						AccessibilityInfo.announceForAccessibility(answer.line);
					}
				});
		}
	};

	const start = (draft: Draft) => {
		Keyboard.dismiss();
		playAffirmativePress();
		setPaper(draft.text);
		setLine(null);
		setStage("wait");
		const began = Date.now();
		const floor = reduced ? MIN_WAIT.reduced : MIN_WAIT.full;
		send(draft).then((answer) => {
			if (alive.current) {
				later(Math.max(0, floor - (Date.now() - began)), () => play(answer));
			}
		});
	};

	const closeCare = () => {
		setCare(false);
		unfold(() => undefined);
	};

	return { care, closeCare, limit, line, paper, stage, start };
}
