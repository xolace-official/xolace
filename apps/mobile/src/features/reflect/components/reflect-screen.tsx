import AccountCircle from "@expo/material-symbols/account_circle.xml";
import CrisisAlert from "@expo/material-symbols/crisis_alert.xml";
import GraphicEq from "@expo/material-symbols/graphic_eq.xml";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useEffect, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { EaseView } from "react-native-ease";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MorphLoader } from "@/src/components/shared/loader/morph/morph-loader";
import { useFeedbackShake } from "@/src/features/feedback-tray/feedback-tray-provider";
import { ReflectWash } from "@/src/features/reflect/components/reflect-wash";
import { SpaceNamePromptDialog } from "@/src/features/reflect/components/space-name-prompt-dialog";
import { ClarifyFeedbackSheet } from "@/src/features/reflect/components/states/clarify-feedback-sheet";
import { ClarifyState } from "@/src/features/reflect/components/states/clarify-state";
import { ErrorState } from "@/src/features/reflect/components/states/error-state";
import { EscalationState } from "@/src/features/reflect/components/states/escalation-state";
import { GaveUpState } from "@/src/features/reflect/components/states/gave-up-state";
import { MirrorState } from "@/src/features/reflect/components/states/mirror-state";
import { PathSelectionState } from "@/src/features/reflect/components/states/path-selection-state";
import { ProcessingState } from "@/src/features/reflect/components/states/processing-state";
import { ComposeScreen } from "@/src/features/reflect/compose/compose-screen";
import { DictationUpsellDialog } from "@/src/features/reflect/compose/dictation-upsell-dialog";
import { MAX_TURNS } from "@/src/features/reflect/hooks/reflection-reducer";
import { useReflectBridge } from "@/src/features/reflect/hooks/use-reflect-bridge";
import { useReflectionMachine } from "@/src/features/reflect/hooks/use-reflection-machine";
import { useReplySeed } from "@/src/features/reflect/hooks/use-reply-seed";
import { useScreenTransition } from "@/src/features/reflect/hooks/use-screen-transition";
import {
	DEFAULT_SCREEN_TRANSITION,
	SCREEN_TRANSITIONS,
} from "@/src/features/reflect/reflect-transitions";
import type { ReflectionStateName } from "@/src/features/reflect/types";
import { TalkDoorDialog, useTalkDoor } from "@/src/features/talk/talk-door";
import { computeQuietReturn } from "@/src/helpers/utils/user-variant";
import { useFullContext } from "@/src/lib/convex/use-full-context";
import { useAppStore } from "@/src/store/store";

const EASE_ANIMATE_OUT = { opacity: 0 };

const WASH_FADE_IN = FadeIn.duration(300);
// Matches the compose screen's exit (SCREEN_TRANSITIONS.typing.exit) so the
// wash leaves with the card instead of as a second darkening after it.
const WASH_FADE_OUT = FadeOut.duration(500);

const WASH_SCREENS: ReflectionStateName[] = ["idle", "typing", "typing-nudge"];
const isWashScreen = (screen: ReflectionStateName) =>
	WASH_SCREENS.includes(screen);

export const ReflectScreen = () => {
	const router = useRouter();
	const talkDoor = useTalkDoor();
	const {
		state,
		dispatch,
		isLoading,
		sessionId,
		mirrorText,
		escalationResources,
		toneUsed,
		claimStrength,
		processingStage,
		rawInput,
		isRecording,
		plusDictation,
		dictationUpsell,
		submitReflection,
		submitScaffold,
		submitClarification,
		handleThatsIt,
		handleNotQuite,
		handleSayMore,
		handleGaveUpPathSelection,
		handleEscalationEngage,
		handleEscalationContinue,
		handleEscalationDismiss,
		handleSelectExit,
		handleSelectSolo,
		handleSelectPeers,
		handleReset,
		handleRetry,
		startVoiceFromIdle,
		startVoiceFromTyping,
		handleDismissTyping,
		turnsCount,
	} = useReflectionMachine();
	const insets = useSafeAreaInsets();
	const safeAreaStyle = { paddingTop: insets.top };
	// Warm amber 'warning' tint sets the crisis button apart without the alarm of
	// a hard red — gentle but present, in keeping with the campfire palette.
	const crisisTint = useThemeColor("warning") as string;

	// Shake-to-feedback on the reflect canvas: suppressed only during active
	// articulation (typing / nudge / processing). Allowed in idle, mirror, and
	// every other state — a shake there is signal, not noise. `enabled` is
	// pure-derived from machine state, no syncing effect.
	useFeedbackShake({
		enabled:
			state.screen !== "typing" &&
			state.screen !== "typing-nudge" &&
			state.screen !== "processing",
	});
	// A reply the user chose to start from (#316). It is the card's line, never
	// the input's contents — the composer opens empty.
	const clearReplySeed = useAppStore((s) => s.clearReplySeed);
	const idleMenuOpen = useAppStore((s) => s.idleMenuOpen);

	const context = useFullContext();
	const updatePreferences = useMutation(api.preferences.update);
	const { current, outgoing, isTransitioning, onOutgoingComplete } =
		useScreenTransition(state.screen);

	const [showSpaceNameDialog, setShowSpaceNameDialog] = useState(false);
	const [spaceNameDialogFired, setSpaceNameDialogFired] = useState(false);
	const [mirrorFeedbackTurn, setMirrorFeedbackTurn] = useState<number | null>(
		null
	);
	const [mirrorFeedbackShown, setMirrorFeedbackShown] = useState(false);

	// Visible only while clarify is settled and on top. Derived, so leaving
	// clarify — "← Back to mirror", give-up on the last turn, escalation, an
	// error — closes the sheet instead of stranding it over another screen.
	const mirrorFeedbackOpen =
		mirrorFeedbackTurn !== null &&
		current === "clarify" &&
		!isTransitioning &&
		sessionId !== null;

	const [prevScreen, setPrevScreen] = useState(state.screen);
	// The last idle/typing/typing-nudge screen the reducer was on. Once it has
	// moved on (processing, error, ...) the compose screen is only ever the
	// outgoing copy, and it must keep reading as the screen the user actually
	// left — not as `state.screen`, which no longer names a compose screen and
	// would flip a collapsed idle card to fully expanded for its fade-out.
	const [lastComposeScreen, setLastComposeScreen] =
		useState<ReflectionStateName>(
			isWashScreen(state.screen) ? state.screen : "idle"
		);
	const composeScreen = isWashScreen(state.screen)
		? state.screen
		: lastComposeScreen;
	if (state.screen !== prevScreen) {
		setPrevScreen(state.screen);
		if (isWashScreen(state.screen)) {
			setLastComposeScreen(state.screen);
		}
		if (mirrorFeedbackTurn !== null && state.screen !== "clarify") {
			setMirrorFeedbackTurn(null);
		}
		// Idle is the start of a session, so re-arm the one-per-session feedback
		// sheet here — the screen stays mounted across sessions ("Start fresh",
		// "Have more? I'm here."), and without this the sheet would only ever be
		// offered for the first session of the mount.
		if (state.screen === "idle" && mirrorFeedbackShown) {
			setMirrorFeedbackShown(false);
		}
	}

	const handleNotQuiteWithFeedback = () => {
		if (!mirrorFeedbackShown) {
			setMirrorFeedbackShown(true);
			setMirrorFeedbackTurn(turnsCount);
		}
		handleNotQuite();
	};

	useReplySeed(state.screen, dispatch);
	useReflectBridge(state.screen, isLoading, dispatch);

	useEffect(() => {
		if (!context?.profile) {
			return;
		}
		dispatch({
			tier: computeQuietReturn(context.profile),
			type: "SET_QUIET_RETURN",
		});
	}, [context?.profile, dispatch]);

	if (
		current === "path-selection" &&
		!spaceNameDialogFired &&
		context?.preferences &&
		!context.preferences.spaceName &&
		!context.preferences.spaceNamePromptDismissed
	) {
		setSpaceNameDialogFired(true);
		setShowSpaceNameDialog(true);
	}

	const renderScreen = (screen: ReflectionStateName, isOutgoing = false) => {
		switch (screen) {
			// idle normalizes to typing (#256): one compose screen renders both, and
			// which one it is reading as comes from state.screen, not from `screen`.
			case "idle":
			case "typing":
			case "typing-nudge":
				return (
					<ComposeScreen
						dispatch={dispatch}
						entryText={state.entryText}
						// The outgoing copy is a fading picture of the screen being left;
						// it must not pull focus from the one arriving.
						focusOnExpand={!isOutgoing}
						isRecording={isRecording}
						onDismiss={() => {
							// Closing the composer spends the offer: the draft survives
							// (#258), but the card goes back to its own voice.
							clearReplySeed();
							handleDismissTyping();
						}}
						onScaffoldSubmit={submitScaffold}
						onSubmit={submitReflection}
						onTap={() => dispatch({ type: "TAP_INPUT" })}
						onVoiceTapIdle={startVoiceFromIdle}
						onVoiceTapTyping={startVoiceFromTyping}
						plusDictation={plusDictation}
						quietReturn={state.quietReturn}
						screen={composeScreen}
						selectedTextures={state.selectedTextures}
						spaceName={context?.preferences?.spaceName}
					/>
				);
			case "processing":
				return <ProcessingState stage={processingStage} />;
			case "mirror":
				return (
					<MirrorState
						atCap={turnsCount >= MAX_TURNS}
						claimStrength={claimStrength}
						entryType={state.entryType}
						mirror={mirrorText ?? ""}
						onNotQuite={handleNotQuiteWithFeedback}
						onSayMore={handleSayMore}
						onThatsIt={handleThatsIt}
						selectedTextures={state.selectedTextures}
						sessionId={sessionId}
						toneUsed={toneUsed}
					/>
				);
			case "clarify":
				return (
					<ClarifyState
						// Armed, not open: the sheet is still transitioning in at mount
						// time, and autoFocus would raise the keyboard underneath it.
						autoFocus={!isOutgoing && mirrorFeedbackTurn === null}
						clarifyText={state.clarifyText}
						dispatch={dispatch}
						feedbackType={state.lastFeedbackType}
						missReason={state.missReason}
						onSubmit={submitClarification}
						previousMirror={mirrorText ?? ""}
					/>
				);
			case "gave-up":
				return (
					<GaveUpState
						onPathSelection={handleGaveUpPathSelection}
						onReset={handleReset}
						sessionId={sessionId ?? undefined}
					/>
				);
			case "escalation":
				return (
					<EscalationState
						mirror={mirrorText ?? ""}
						onContinue={handleEscalationContinue}
						onDismiss={handleEscalationDismiss}
						onEngage={handleEscalationEngage}
						resources={escalationResources}
					/>
				);
			case "path-selection":
				return (
					<PathSelectionState
						mirrorLanded={
							claimStrength !== "reaching" &&
							claimStrength !== "holding" &&
							turnsCount < MAX_TURNS
						}
						onSelectExit={handleSelectExit}
						onSelectPeers={handleSelectPeers}
						onSelectSolo={handleSelectSolo}
						sessionId={sessionId}
					/>
				);
			case "error":
				return (
					<ErrorState
						errorMessage={state.errorMessage || "Something went wrong."}
						onReset={handleReset}
						onRetry={handleRetry}
						rawInput={rawInput}
					/>
				);
		}
	};

	// Outgoing screens first so the arriving one paints on top of them. Keyed
	// by screen name: a screen that turns outgoing keeps its React instance —
	// and with it everything it settled at mount (the frozen header height,
	// Flux's perch, the morph's progress) — instead of being re-mounted as a
	// fresh copy that lays itself out differently while it fades.
	const screens = [...outgoing, current];

	// The same box the settled screen fills — `bottom: 0`, not the bottom
	// inset, because the host only pads the top and each screen handles its own
	// bottom. Any difference here reflows the outgoing screen at t=0.
	const absoluteFill: ViewStyle = {
		bottom: 0,
		left: 0,
		position: "absolute",
		right: 0,
		top: insets.top,
	};

	// The settled screen name is `typing` for both idle and composing since #256,
	// so the header follows the reducer's own state: it belongs to the resting
	// card, and it gets out of the way the moment the composer opens.
	const isIdle = state.screen === "idle";
	// The wash belongs to the idle/typing canvas and fades out on the same
	// clock as the outgoing compose screen. Keeping it until that screen had
	// unmounted made it a second, later darkening behind the arriving state.
	const showWash = isWashScreen(current);
	const stackScreenOptions = {
		headerBackVisible: false,
		headerShadowVisible: false,
		headerShown: isIdle,
		headerTitle: "",
		headerTransparent: true,
	};

	if (isLoading) {
		return (
			<View
				className="flex-1 items-center justify-center bg-background"
				style={safeAreaStyle}
			>
				<MorphLoader />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background" style={safeAreaStyle}>
			<Stack.Screen options={stackScreenOptions} />
			{showWash && (
				<Animated.View
					entering={WASH_FADE_IN}
					exiting={WASH_FADE_OUT}
					pointerEvents="none"
					// Absolute children lay out against the border box, so this ignores
					// the host's safe-area padding and the wash runs edge to edge —
					// under the status bar and the home indicator.
					style={StyleSheet.absoluteFill}
				>
					<ReflectWash />
				</Animated.View>
			)}
			{/* Mounted only while idle. A `hidden` toolbar button still leaves its
          transparent host view laid out across the top of the screen on
          Android, where (unlike UIKit) an invisible view still consumes
          touches — that band swallowed the typing screen's mic and close.
          Down, too, while the idle menu is open: its scrim can't reach over
          the native header, so the buttons would sit sharp above the blur. */}
			{isIdle && !idleMenuOpen && (
				<>
					<Stack.Toolbar placement="left">
						<Stack.Toolbar.Button
							icon={
								process.env.EXPO_OS === "ios" ? "person.circle" : AccountCircle
							}
							onPress={() => router.push("/(protected)/profile")}
						/>
					</Stack.Toolbar>
					<Stack.Toolbar placement="right">
						{/* The talk door shares the crisis button's glass container (#586). */}
						<Stack.Toolbar.Button
							accessibilityLabel="Start a talk"
							icon={process.env.EXPO_OS === "ios" ? "waveform" : GraphicEq}
							onPress={talkDoor.onPress}
						/>
						<Stack.Toolbar.Button
							icon={
								process.env.EXPO_OS === "ios" ? "lifepreserver" : CrisisAlert
							}
							onPress={() => router.push("/crisis-resources?from=idle_button")}
							tintColor={crisisTint}
						/>
					</Stack.Toolbar>
				</>
			)}
			{screens.map((screen) => {
				const isOutgoing = screen !== current;
				const config = SCREEN_TRANSITIONS[screen] ?? DEFAULT_SCREEN_TRANSITION;
				return (
					// On mount EaseView runs initialAnimate → animate (the enter). When
					// `animate` later flips to the exit values it animates the change
					// on the same native view and emits onTransitionEnd once settled,
					// so the exit is a prop change, not a remount.
					<EaseView
						animate={isOutgoing ? EASE_ANIMATE_OUT : config.enter.animate}
						initialAnimate={config.enter.initialAnimate}
						key={screen}
						onTransitionEnd={
							isOutgoing
								? // A batch cut short by a newer one reports finished: false;
									// only a fade that ran to the end releases the screen.
									(e) => e.finished && onOutgoingComplete(screen)
								: undefined
						}
						style={isTransitioning ? absoluteFill : styles.fill}
						transition={
							isOutgoing ? config.exit.transition : config.enter.transition
						}
					>
						{renderScreen(screen, isOutgoing)}
					</EaseView>
				);
			})}

			{/* Mirror feedback — fires when user rejects a mirror, persists through screen transition */}
			<ClarifyFeedbackSheet
				isOpen={mirrorFeedbackOpen}
				onClose={() => setMirrorFeedbackTurn(null)}
				onPick={(reason) => dispatch({ reason, type: "MISS_REASON" })}
				sessionId={sessionId}
				turnIndex={mirrorFeedbackTurn ?? 0}
			/>

			<DictationUpsellDialog {...dictationUpsell} />
			<TalkDoorDialog door={talkDoor} />

			{/* Space naming — fires once on first path-selection when unnamed */}
			<SpaceNamePromptDialog
				isOpen={showSpaceNameDialog}
				onDismiss={async () => {
					await updatePreferences({ spaceNamePromptDismissed: true });
					setShowSpaceNameDialog(false);
				}}
				onSave={async (name) => {
					await updatePreferences({ spaceName: name });
					setShowSpaceNameDialog(false);
				}}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	fill: { flex: 1 },
});
