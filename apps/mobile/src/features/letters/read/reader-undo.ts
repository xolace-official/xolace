import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { LETTERS, UNDO_SECONDS } from "../copy";
import { readerAcknowledged, readerHidden, type Undo } from "../letters-model";
import { leaveReader } from "../letters-routes";
import type { LetterReader } from "./read-data";
import { createUndoTimer } from "./undo-timer";

const UNDO_MS = UNDO_SECONDS * 1000;

/**
 * Acknowledge and Hide, each undoable for 5 s (handoff §3). The reader shows them at once; the
 * data module hears only once Undo has passed, or as the reader closes (leaving keeps it). Hide,
 * once final, leaves the reader still drifted away, Undo and all, so nothing springs back in.
 * An acknowledgement stays shown from here on, whatever the server has caught up to.
 */
export function useReaderUndo({ state, actions }: LetterReader) {
	const [undo, setUndo] = useState<Undo | null>(state.opens.undo);
	const [acknowledgedHere, setAcknowledgedHere] = useState(false);
	const [timer] = useState(() => createUndoTimer(UNDO_MS, setUndo));
	useEffect(() => () => timer.leave(), [timer]);

	const begin = (kind: Undo, commit: () => void, after: () => void) => {
		const began = timer.begin(kind, { after, commit, hold: kind === "hide" });
		if (began) {
			const what =
				kind === "ack"
					? LETTERS.read.undoAcknowledged
					: LETTERS.read.undoHidden;
			AccessibilityInfo.announceForAccessibility(
				LETTERS.read.undoAvailable(what)
			);
		}
	};

	const letter = state.letter;
	const acknowledged = readerAcknowledged(letter, acknowledgedHere, undo);
	return {
		acknowledge: () => {
			if (!(acknowledged || undo)) {
				begin(
					"ack",
					() => {
						setAcknowledgedHere(true);
						actions.acknowledge();
					},
					() =>
						AccessibilityInfo.announceForAccessibility(
							LETTERS.read.acknowledged
						)
				);
			}
		},
		acknowledged,
		hidden: readerHidden(letter, undo),
		hide: () => {
			if (!undo) {
				begin("hide", actions.hide, leaveReader);
			}
		},
		undo,
		undoIt: timer.cancel,
		unhide: () => {
			actions.unhide();
			AccessibilityInfo.announceForAccessibility(LETTERS.read.unhidden);
		},
	};
}
