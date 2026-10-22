import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { ActionRow } from "@/src/features/quotes/components/poster/action-row";
import { ComposePanel } from "@/src/features/quotes/components/poster/compose-panel";
import { DeckCard } from "@/src/features/quotes/components/poster/deck-card";
import { HeartBurst, useHeartBurst } from "@/src/features/quotes/components/heart-burst";
import { HeroCard } from "@/src/features/quotes/components/poster/hero-card";
import { PosterBody } from "@/src/features/quotes/components/poster/poster-body";
import { PosterSourceLine } from "@/src/features/quotes/components/poster/poster-source-line";
import { PreferenceSetupSheet } from "@/src/features/quotes/components/preference-setup-sheet";
import { QuoteLoadingAndError } from "@/src/features/quotes/components/quote-loading-and-error";
import { QuoteShareSheet } from "@/src/features/quotes/components/quote-share-sheet";
import { StarButton } from "@/src/features/quotes/components/poster/star-button";
import { SharingCard } from "@/src/features/quotes/components/sharing-card";
import { useQuoteSharing } from "@/src/features/quotes/hooks/use-quote-sharing";
import { useTodayQuote } from "@/src/features/quotes/hooks/use-today-quote";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { usePaywall } from "@/src/features/purchases/use-paywall";

const EASE_INITIAL = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const EASE_TRANSITION = {
  type: "timing" as const,
  duration: 400,
  easing: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
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
      if (ok && next === "resonates") heartBurst.trigger();
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
            contentContainerStyle={{ padding: 24, paddingTop: top + 24, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <EaseView
              initialAnimate={EASE_INITIAL}
              animate={EASE_ANIMATE}
              transition={EASE_TRANSITION}
            >
              <PreferenceSetupSheet
                onComplete={completePreferences}
                isLoading={isCompletingPreferences}
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
        <HeartBurst scale={heartBurst.scale} opacity={heartBurst.opacity} />
        <KeyboardAwareScrollView
          contentContainerStyle={{ paddingBottom: bottom + 16 }}
          showsVerticalScrollIndicator={false}
          // Without this the first tap on the composer's send pill is eaten
          // dismissing the keyboard, and the user has to tap Share twice.
          keyboardShouldPersistTaps="handled"
        >
          <HeroCard
            onBack={goBack}
            star={
              hasQuote ? (
                <StarButton
                  saved={quote.savedAt !== undefined}
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
                  locked={saveLocked && quote.savedAt === undefined}
                />
              ) : null
            }
            actions={
              hasQuote ? (
                <ActionRow
                  resonates={quote.reaction === "resonates"}
                  isSharingLoading={isSharingLoading}
                  onShare={handleShare}
                  onReact={handleReact}
                />
              ) : (
                // holds the row's space so the hero does not grow when the
                // quote lands — the poster box is only half of that promise
                <View className="mt-4 h-12" />
              )
            }
          >
            {hasQuote ? (
              <>
                <PosterSourceLine
                  line={sourceLine}
                  onUnlock={() => openPaywall("daily_quote")}
                />
                <PosterBody title={quote.title} body={removeEmDash(quote.text)} />
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
                  reply={quote.reply}
                  flagged={quote.replyModeration?.flagged ?? false}
                  reachSubline={replyReaches && !replyUnmoderated}
                  remembered={replyRemembered && !replyUnmoderated}
                  isSending={isSendingReply}
                  onSend={sendReply}
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
          visible={showShareSheet}
          imageUri={shareImageUri}
          quoteType={quote?.type ?? "curated"}
          onClose={() => {
            setShowShareSheet(false);
            setShareImageUri(null);
          }}
        />

        {/* Off-screen sharing card for capture */}
        {showSharingCard && quote && (
          <View
            style={styles.offscreen}
            pointerEvents="none"
            onLayout={onSharingCardLayout}
          >
            <SharingCard
              ref={sharingCardRef}
              title={quote.title}
              text={removeEmDash(quote.text)}
              onReady={onSharingCardImageLoadEnd}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: "absolute", top: -10000, left: 0 },
});
