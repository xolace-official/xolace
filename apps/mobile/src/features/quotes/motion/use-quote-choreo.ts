import { useEffect, useState } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import {
	EASE,
	LIFT,
	type QuoteMotion,
	SETTLED,
	T,
	wordsEnd,
} from "./quote-motion";
import {
	isSheetView,
	isSoftView,
	isWriteView,
	type QuoteView,
} from "./quote-ui";

const arrivalMs = (words: number) => wordsEnd(words) + T.acts.ms;
const hidesStage = (v: QuoteView) => v === "share" || v === "kept";

export function useQuoteChoreo(o: {
	view: QuoteView;
	clear: boolean;
	arrive: boolean;
	words: number;
	reduced: boolean;
}) {
	const { view, clear, reduced, arrive, words } = o;
	const clock = useSharedValue(SETTLED);
	const [arrived, setArrived] = useState(false);
	const open = isSheetView(view);
	const sheet = useSharedValue(open ? 1 : 0);
	const lift = isWriteView(view) ? LIFT.write : LIFT.pick;
	const liftY = useSharedValue<number>(lift.y);
	const liftScale = useSharedValue<number>(lift.scale);
	const soft = useSharedValue(isSoftView(view) ? 1 : 0);
	const chrome = useSharedValue(clear ? 0 : 1);
	const stage = useSharedValue(hidesStage(view) ? 0 : 1);
	const acts = useSharedValue(view === "today" ? 1 : 0);
	const [shownSheet, setShownSheet] = useState<QuoteView | null>(
		open ? view : null
	);

	if (open && shownSheet !== view) {
		setShownSheet(view);
	}

	useEffect(() => {
		if (!arrive || arrived) {
			return;
		}
		setArrived(true);
		const ms = reduced ? T.reduced : arrivalMs(words);
		clock.set(0);
		clock.set(
			withTiming(ms, { duration: ms, easing: Easing.linear, ...PLAY_AS_CHOSEN })
		);
	}, [arrive, arrived, reduced, words, clock]);

	useEffect(() => {
		if (open && view !== "share") {
			const to = isWriteView(view) ? LIFT.write : LIFT.pick;
			liftY.set(to.y);
			liftScale.set(to.scale);
		}
		const hide = () => setShownSheet(null);
		sheet.set(
			withTiming(
				open ? 1 : 0,
				{
					duration: reduced ? T.reduced : T.stage,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				},
				(done) => {
					if (done && !open) {
						scheduleOnRN(hide);
					}
				}
			)
		);
		soft.set(
			withTiming(isSoftView(view) ? 1 : 0, {
				duration: reduced ? T.reduced : T.soft,
				easing: EASE.stage,
				...PLAY_AS_CHOSEN,
			})
		);
		stage.set(
			withTiming(hidesStage(view) ? 0 : 1, {
				duration: T.stageGone,
				...PLAY_AS_CHOSEN,
			})
		);
		acts.set(
			withTiming(view === "today" ? 1 : 0, {
				duration: reduced ? T.reduced : T.actsHide,
				easing: EASE.stage,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [view, open, reduced, sheet, soft, stage, acts, liftY, liftScale]);

	useEffect(() => {
		chrome.set(
			withTiming(clear ? 0 : 1, {
				duration: reduced ? T.reduced : T.chrome,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [clear, reduced, chrome]);

	const motion: QuoteMotion = {
		acts,
		chrome,
		clock,
		liftScale,
		liftY,
		reduced,
		sheet,
		soft,
		stage,
	};
	return { motion, shownSheet };
}
