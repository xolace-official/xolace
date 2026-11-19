import { StatusBar } from "expo-status-bar";
import { useLayoutEffect, useState } from "react";
import { PixelRatio, View } from "react-native";
import {
	GestureDetector,
	useExclusiveGestures,
	useLongPressGesture,
	useTapGesture,
} from "react-native-gesture-handler";
import { useFixedFaces } from "@/design/fonts";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { QuoteBackground } from "./background/quote-background";
import { useAmbientSound } from "./background/use-ambient-sound";
import { QuoteChrome } from "./chrome/quote-chrome";
import { useQuoteInk } from "./chrome/quote-ink";
import { QuoteMotionContext, T } from "./motion/quote-motion";
import { QUOTE_UI_DEFAULTS, useQuoteUi } from "./motion/quote-ui";
import { useQuoteChoreo } from "./motion/use-quote-choreo";
import { useQuoteHandlers } from "./motion/use-quote-handlers";
import { loopState, quoteType, soundPlays } from "./quotes-model";
import { useQuotesScreen } from "./quotes-screen-data";
import { QuoteSheets } from "./sheets/quote-sheets";
import { QuoteStage } from "./stage/quote-stage";

/**
 * Quotes (S11, handoff `quotes.md`): today's quote full screen over a background you choose, with
 * Write back, Resonate (free), Keep (Xolace+), Share (an image) and Words you kept.
 */
export function QuotesScreen() {
	const value = useQuotesScreen();
	const { state } = value;
	const [initial] = useState(() => ({
		...QUOTE_UI_DEFAULTS,
		...state.initialUi,
	}));
	// Every open starts clean (or on a dev state's view), before the first paint.
	useLayoutEffect(() => {
		useQuoteUi.setState(initial);
	}, [initial]);
	const ui = useQuoteUi();
	const reduced = useEffectiveReducedMotion();
	const faces = useFixedFaces("poster-medium", "poster-semi");
	const inks = useQuoteInk();
	const h = useQuoteHandlers(value);
	const b = state.background;
	const ink = inks.inks[b.ink];
	const text = state.quote?.text ?? "";
	const words = text ? text.split(" ").length : 0;
	const type = quoteType(text, PixelRatio.getFontScale());
	const { motion, shownSheet } = useQuoteChoreo({
		arrive: state.status === "ready" && faces,
		clear: ui.clear,
		reduced,
		view: ui.view,
		words,
	});
	const loop = loopState({
		active: state.active,
		kind: b.kind,
		lowPower: state.lowPower,
		paused: ui.paused,
		reduced,
		sharing: ui.view === "share",
	});
	useAmbientSound(
		b.audioUrl,
		soundPlays({
			hasAudio: Boolean(b.audioUrl),
			playing: loop.playing,
			soundOn: state.soundOn,
		})
	);

	const hold = useLongPressGesture({
		minDuration: T.longPress,
		onActivate: h.hold,
		runOnJS: true,
	});
	const tap = useTapGesture({ onActivate: h.tap, runOnJS: true });
	const hit = useExclusiveGestures(hold, tap);

	return (
		<QuoteMotionContext value={motion}>
			<View className="flex-1 bg-black">
				<StatusBar style={b.ink === "dark" ? "dark" : "light"} />
				<QuoteBackground background={b} play={loop.playing} />
				<GestureDetector gesture={hit}>
					<View accessible={false} className="absolute inset-0" />
				</GestureDetector>
				{faces && (
					<QuoteStage
						ink={ink}
						lineHeight={type.lineHeight}
						onDouble={h.double}
						onGate={h.plusReason}
						onHold={h.hold}
						onRetry={h.retry}
						onTap={h.tap}
						reason={state.reason}
						shadowColor={inks.shadowColor}
						size={type.size}
						status={state.status}
						text={text}
						title={state.quote?.title}
					/>
				)}
				<QuoteChrome
					h={h}
					ink={ink}
					moving={loop.moving}
					reduced={reduced}
					words={words}
				/>
				<QuoteSheets
					h={h}
					ink={ink}
					inks={inks}
					moving={loop.moving}
					reduced={reduced}
					shownSheet={shownSheet}
				/>
			</View>
		</QuoteMotionContext>
	);
}
