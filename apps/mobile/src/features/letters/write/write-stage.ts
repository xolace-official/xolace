import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard } from "react-native";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { LETTER_MOTION } from "../letter-motion";
import {
	afterAnswer,
	type Draft,
	lateMoves,
	type SendAnswer,
	type WriteLimit,
	type WriteStage,
	waitLeft,
} from "../letters-model";
import type { WriteOpens } from "./write-data";

const M = LETTER_MOTION;

export function useWriteStage({
	opens,
	reduced,
	text,
	send,
	late,
	played,
}: {
	opens: WriteOpens;
	reduced: boolean;
	text: string;
	send: (draft: Draft) => Promise<SendAnswer | null>;
	late: SendAnswer | null;
	played: () => void;
}) {
	const [stage, setStage] = useState<WriteStage>(opens.stage);
	const [line, setLine] = useState<string | null>(opens.line);
	const [care, setCare] = useState(opens.care);
	const [limit, setLimit] = useState<WriteLimit | null>(null);
	const [paper, setPaper] = useState(text);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const alive = useRef(true);
	const own = useRef(false);
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

	useEffect(() => {
		if (!late || own.current) {
			return;
		}
		played();
		const moves = lateMoves(late);
		if (!moves) {
			return;
		}
		setStage(moves.stage);
		setLine(moves.line);
		setCare(moves.care);
		if (moves.announce) {
			AccessibilityInfo.announceForAccessibility(moves.announce);
		}
	}, [late, played]);

	const play = (answer: SendAnswer) => {
		own.current = false;
		played();
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
		own.current = true;
		send(draft).then((answer) => {
			if (!answer) {
				own.current = false;
				setStage("edit");
				return;
			}
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
