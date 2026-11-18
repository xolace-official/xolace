import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { LETTERS, UNDO_SECONDS } from "../copy";
import type { LetterReader, Undo } from "./read-data";

const UNDO_MS = UNDO_SECONDS * 1000;

/**
 * Acknowledge and Hide, each undoable for 5 s (handoff §3). The reader shows them at once; the
 * data module hears only once Undo has passed, or as the reader closes (leaving keeps it). Hide,
 * once final, goes back to where the letter was opened from.
 */
export function useReaderUndo({ state, actions }: LetterReader) {
	const [undo, setUndo] = useState<Undo | null>(state.opens.undo);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// What Undo would cancel: run when the 5 s pass, or as the reader closes.
	const pending = useRef<(() => void) | null>(null);

	useEffect(
		() => () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
			pending.current?.();
		},
		[]
	);

	const begin = (kind: Undo, commit: () => void, after?: () => void) => {
		setUndo(kind);
		pending.current = commit;
		const what =
			kind === "ack" ? LETTERS.read.undoAcknowledged : LETTERS.read.undoHidden;
		AccessibilityInfo.announceForAccessibility(
			LETTERS.read.undoAvailable(what)
		);
		timer.current = setTimeout(() => {
			pending.current = null;
			setUndo(null);
			commit();
			after?.();
		}, UNDO_MS);
	};

	const cancel = () => {
		if (timer.current) {
			clearTimeout(timer.current);
		}
		pending.current = null;
		setUndo(null);
	};

	const letter = state.letter;
	const acknowledged = (letter?.acknowledged ?? false) || undo === "ack";
	return {
		acknowledge: () => {
			if (!(acknowledged || undo)) {
				begin("ack", actions.acknowledge, () =>
					AccessibilityInfo.announceForAccessibility(LETTERS.read.acknowledged)
				);
			}
		},
		acknowledged,
		hidden: (letter?.hidden ?? false) && undo !== "hide",
		hide: () => {
			if (!undo) {
				begin("hide", actions.hide, () => router.back());
			}
		},
		undo,
		undoIt: cancel,
		unhide: () => {
			actions.unhide();
			AccessibilityInfo.announceForAccessibility(LETTERS.read.unhidden);
		},
	};
}
