import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePaywall } from "@/features/purchases/use-paywall";
import {
	HeartBurst,
	useHeartBurst,
} from "@/features/quotes/components/heart-burst";
import { ActionRow } from "@/features/quotes/components/poster/action-row";
import { ComposePanel } from "@/features/quotes/components/poster/compose-panel";
import { DeckCard } from "@/features/quotes/components/poster/deck-card";
import { HeroCard } from "@/features/quotes/components/poster/hero-card";
import { PosterBody } from "@/features/quotes/components/poster/poster-body";
import { PosterSourceLine } from "@/features/quotes/components/poster/poster-source-line";
import { StarButton } from "@/features/quotes/components/poster/star-button";
import { PreferenceSetupSheet } from "@/features/quotes/components/preference-setup-sheet";
import { QuoteLoadingAndError } from "@/features/quotes/components/quote-loading-and-error";
import { QuoteShareSheet } from "@/features/quotes/components/quote-share-sheet";
import { SharingCard } from "@/features/quotes/components/sharing-card";
import { useQuoteSharing } from "@/features/quotes/hooks/use-quote-sharing";
import { useTodayQuote } from "@/features/quotes/hooks/use-today-quote";
import { removeEmDash } from "@/features/quotes/utils/text-utils";

const EASE_INITIAL = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const EASE_TRANSITION = {
	duration: 400,
	easing: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
	type: "timing" as const,
};

export function QuotesScreen() {
	const { top, bottom } = useSafeAreaInsets();
	const router = useRouter();
	const openPaywall = usePaywall((s) => s.open);
	const posthog = usePostHog();

	const {
		quote,
		sourceLine,
		replyReaches,
		replyRemembered,
		isSendingReply,
		sendReply,
		isFirstVisit,
		isColdStarting,
		coldStartError,
		isCompletingPreferences,
		retry,
		react,
		setSaved,
		completePreferences,
		savedCount,
		saveLocked,
	} = useTodayQuote();

	const {
		handleShare,
		onSharingCardLayout,
		onSharingCardImageLoadEnd,
		sharingCardRef,
		isSharingLoading,
		showSharingCard,
		showShareSheet,
		setShowShareSheet,
		shareImageUri,
		setShareImageUri,
	} = useQuoteSharing(quote);

	const heartBurst = useHeartBurst();

	// the burst fires on the way *to* resonating, never on clearing it — and
	// only once the write landed, so a rejected tap doesn't celebrate nothing
	const handleReact = (next: "resonates" | null) => {
		void react(next).then((ok) => {
			if (ok && next === "resonates") {
				heartBurst.trigger();
			}
		});
	};

	const goBack = () => {
		Presets.flick();
		router.back();
	};

	// First visit is its own themed takeover — no hero behind it.
	if (isFirstVisit) {
		return (
			<>
				<StatusBar hidden />
				<View className="flex-1 bg-background">
					<ScrollView
						className="flex-1"
						contentContainerStyle={{
							gap: 16,
							padding: 24,
							paddingTop: top + 24,
						}}
						showsVerticalScrollIndicator={false}
					>
						<EaseView
							animate={EASE_ANIMATE}
							initialAnimate={EASE_INITIAL}
							transition={EASE_TRANSITION}
						>
							<PreferenceSetupSheet
								isLoading={isCompletingPreferences}
								onComplete={completePreferences}
							/>
						</EaseView>
					</ScrollView>
				</View>
			</>
		);
	}

	const hasQuote = quote !== null && sourceLine !== null && !isColdStarting;
	// An unavailable moderation check is not a clean one, so the reply is fed
	// nowhere — neither tomorrow's quote (quotesDistiller) nor the semantic
	// profile (ADR 0007). It is not flagged either, so no crisis panel replaces
	// the confirmation and the subline is the only place that can be honest.
	const replyUnmoderated = quote?.replyModeration?.unavailable ?? false;

	return (
		<>
			<StatusBar hidden />
			<View className="flex-1 bg-background">
				<HeartBurst opacity={heartBurst.opacity} scale={heartBurst.scale} />
				<KeyboardAwareScrollView
					contentContainerStyle={{ paddingBottom: bottom + 16 }}
					// Without this the first tap on the composer's send pill is eaten
					// dismissing the keyboard, and the user has to tap Share twice.
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<HeroCard
						actions={
							hasQuote ? (
								<ActionRow
									isSharingLoading={isSharingLoading}
									onReact={handleReact}
									onShare={handleShare}
									resonates={quote.reaction === "resonates"}
								/>
							) : (
								// holds the row's space so the hero does not grow when the
								// quote lands — the poster box is only half of that promise
								<View className="mt-4 h-12" />
							)
						}
						onBack={goBack}
						star={
							hasQuote ? (
								<StarButton
									locked={saveLocked && quote.savedAt === undefined}
									onToggle={(next) => {
										// The star still taps for a free user — it opens the door
										// rather than doing nothing. Unsaving is never gated
										// (`dailyQuotes.unsave`): a lapsed subscriber must still
										// be able to let go of what they kept.
										if (saveLocked && next) {
											posthog.capture("premium_gate_hit", {
												feature: "quote_save",
												hasData: true,
											});
											openPaywall("daily_quote");
											return;
										}
										void setSaved(next);
									}}
									saved={quote.savedAt !== undefined}
								/>
							) : null
						}
					>
						{hasQuote ? (
							<>
								<PosterSourceLine
									line={sourceLine}
									onUnlock={() => openPaywall("daily_quote")}
								/>
								<PosterBody
									body={removeEmDash(quote.text)}
									title={quote.title}
								/>
							</>
						) : (
							<QuoteLoadingAndError
								coldStartError={coldStartError && !isColdStarting}
								onRetry={retry}
							/>
						)}
					</HeroCard>

					<DeckCard
						composer={
							hasQuote ? (
								<ComposePanel
									flagged={quote.replyModeration?.flagged ?? false}
									isSending={isSendingReply}
									onSend={sendReply}
									reachSubline={replyReaches && !replyUnmoderated}
									remembered={replyRemembered && !replyUnmoderated}
									reply={quote.reply}
								/>
							) : null
						}
						onOpenArchive={() => {
							posthog.capture("quote_archive_opened", {
								kept_count: savedCount ?? 0,
							});
							router.push("/(protected)/quotes/archive");
						}}
					/>
				</KeyboardAwareScrollView>

				<QuoteShareSheet
					imageUri={shareImageUri}
					onClose={() => {
						setShowShareSheet(false);
						setShareImageUri(null);
					}}
					quoteType={quote?.type ?? "curated"}
					visible={showShareSheet}
				/>

				{/* Off-screen sharing card for capture */}
				{showSharingCard && quote && (
					<View
						onLayout={onSharingCardLayout}
						pointerEvents="none"
						style={styles.offscreen}
					>
						<SharingCard
							onReady={onSharingCardImageLoadEnd}
							ref={sharingCardRef}
							text={removeEmDash(quote.text)}
							title={quote.title}
						/>
					</View>
				)}
			</View>
		</>
	);
}

const styles = StyleSheet.create({
	offscreen: { left: 0, position: "absolute", top: -10_000 },
});
