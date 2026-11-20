import { View } from "react-native";
import { useShallow } from "zustand/react/shallow";
import { quoteVideoAvailable } from "@/modules/quote-video";
import { BackgroundSheet } from "../background/background-sheet";
import type { InkPalette, QuoteInk } from "../chrome/quote-ink";
import { KeptStack } from "../kept/kept-stack";
import { type QuoteView, useQuoteUi } from "../motion/quote-ui";
import type { QuoteHandlers } from "../motion/use-quote-handlers";
import { useQuotesScreen } from "../quotes-screen-data";
import { CARD_REF, OVERLAY_REF } from "../share/make-share-file";
import { ShareCard } from "../share/share-card";
import { canShareVideo } from "../share/share-kind";
import { ShareSheet } from "../share/share-sheet";
import { GateSheet } from "./gate-sheet";
import { OfferSheet } from "./offer-sheet";
import { WriteSheet } from "./write-sheet";

const CAPTURE_SCALE = 2.4;
const OFFSCREEN = -10_000;

export function QuoteSheets({
	h,
	ink,
	inks,
	moving,
	reduced,
	shownSheet,
}: {
	h: QuoteHandlers;
	ink: InkPalette;
	inks: QuoteInk;
	moving: boolean;
	reduced: boolean;
	shownSheet: QuoteView | null;
}) {
	const { state } = useQuotesScreen();
	const ui = useQuoteUi(
		useShallow((s) => ({
			cat: s.cat,
			draft: s.draft,
			fmt: s.fmt,
			hist: s.hist,
			making: s.making,
			set: s.set,
			shareKind: s.shareKind,
			view: s.view,
		}))
	);
	const text = state.quote?.text ?? "";
	const b = state.background;
	const canVideo = canShareVideo(b, quoteVideoAvailable);
	const video = canVideo && ui.shareKind === "video";

	return (
		<>
			{shownSheet === "themes" && (
				<BackgroundSheet
					backgrounds={state.backgrounds}
					cat={ui.cat}
					current={b.key}
					ink={ink}
					lowPower={state.lowPower}
					moving={moving}
					onCat={(cat) => ui.set({ cat })}
					onClose={h.toToday}
					onPick={h.pick}
					plus={state.plus}
				/>
			)}
			{(shownSheet === "writing" ||
				shownSheet === "sent" ||
				shownSheet === "flagged") && (
				<WriteSheet
					dark={b.ink === "light"}
					draft={ui.draft}
					ink={ink}
					onClose={h.toToday}
					onDraft={(draft) => ui.set({ draft })}
					onEdit={h.write}
					onReflect={h.reflect}
					onSend={h.send}
					onTalk={h.talk}
					reaches={state.replyReaches}
					sending={state.sending}
					step={shownSheet}
				/>
			)}
			{(shownSheet === "gate" || shownSheet === "gateBackground") && (
				<GateSheet
					ink={ink}
					onClose={h.toToday}
					onPlus={shownSheet === "gate" ? h.plusKeep : h.plusBackground}
					what={shownSheet === "gate" ? "keep" : "background"}
				/>
			)}
			{shownSheet === "offer" && (
				<OfferSheet ink={ink} onAnswer={h.offerAnswer} onClose={h.toToday} />
			)}
			{shownSheet === "share" && (
				<ShareSheet
					background={b}
					canVideo={canVideo}
					drop={inks.drop}
					fmt={ui.fmt}
					ink={ink}
					kind={ui.shareKind}
					making={ui.making}
					moving={moving}
					onClose={h.toToday}
					onFmt={(fmt) => ui.set({ fmt })}
					onKind={(shareKind) => ui.set({ shareKind })}
					onSave={h.save}
					onShare={h.shareGo}
					text={text}
				/>
			)}
			{ui.view === "kept" && (
				<KeptStack
					backgrounds={state.backgrounds}
					cards={state.kept}
					index={ui.hist}
					onBack={h.toToday}
					onIndex={h.keptAt}
					onReflect={h.reflectKept}
					reduced={reduced}
					total={Math.max(state.keptCount, state.kept.length)}
				/>
			)}
			{shownSheet === "share" && (
				<View
					accessibilityElementsHidden
					className="absolute top-0"
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					style={{ left: OFFSCREEN }}
				>
					<ShareCard
						background={b}
						fmt={ui.fmt}
						ref={CARD_REF}
						scale={CAPTURE_SCALE}
						text={text}
					/>
					{video && (
						<ShareCard
							background={b}
							fmt={ui.fmt}
							ref={OVERLAY_REF}
							scale={CAPTURE_SCALE}
							text={text}
							transparent
						/>
					)}
				</View>
			)}
		</>
	);
}
