import { useShallow } from "zustand/react/shallow";
import { QUOTE_COPY } from "../copy";
import { wordsEnd } from "../motion/quote-motion";
import { useQuoteUi } from "../motion/quote-ui";
import type { QuoteHandlers } from "../motion/use-quote-handlers";
import { useQuotesScreen } from "../quotes-screen-data";
import { QuoteActions } from "./quote-actions";
import { ClearHint, HeartBurst, QuoteToast } from "./quote-flourish";
import type { InkPalette } from "./quote-ink";
import { QuoteTopBar } from "./quote-top-bar";

export function QuoteChrome({
	h,
	ink,
	moving,
	reduced,
	words,
}: {
	h: QuoteHandlers;
	ink: InkPalette;
	moving: boolean;
	reduced: boolean;
	words: number;
}) {
	const { state } = useQuotesScreen();
	const ui = useQuoteUi(
		useShallow((s) => ({
			burstKey: s.burstKey,
			clear: s.clear,
			paused: s.paused,
			toast: s.toast,
			view: s.view,
		}))
	);
	const ready = state.status === "ready";

	return (
		<>
			<QuoteActions
				arriveAt={wordsEnd(words)}
				hidden={!ready || ui.view !== "today" || ui.clear}
				ink={ink}
				keptCount={state.keptCount}
				onHeart={h.heart}
				onKept={h.kept}
				onShare={h.share}
				onWrite={h.write}
				res={state.resonated}
				writeLabel={state.reply ? QUOTE_COPY.yourReply : QUOTE_COPY.writeBack}
			/>
			<QuoteTopBar
				hidden={ui.view === "kept" || ui.clear}
				ink={ink}
				locked={state.saveLocked && !state.saved}
				onClose={h.close}
				onPause={h.pause}
				onSound={h.sound}
				onStar={h.star}
				onThemes={h.themes}
				paused={ui.paused}
				saved={state.saved}
				showPause={moving}
				showSound={moving && Boolean(state.background.audioUrl)}
				soundOn={state.soundOn}
			/>
			{ui.clear && (
				<ClearHint ink={ink} reduced={reduced} text={QUOTE_COPY.clearHint} />
			)}
			<HeartBurst burstKey={ui.burstKey} reduced={reduced} />
			<QuoteToast ink={ink} reduced={reduced} toast={ui.toast} />
		</>
	);
}
