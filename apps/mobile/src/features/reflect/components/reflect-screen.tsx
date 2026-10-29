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
import { MorphLoader } from "@/components/shared/loader/morph/morph-loader";
import { useFeedbackShake } from "@/features/feedback-tray/feedback-tray-provider";
import { ReflectWash } from "@/features/reflect/components/reflect-wash";
import { SpaceNamePromptDialog } from "@/features/reflect/components/space-name-prompt-dialog";
import { ClarifyFeedbackSheet } from "@/features/reflect/components/states/clarify-feedback-sheet";
import { ClarifyState } from "@/features/reflect/components/states/clarify-state";
import { ErrorState } from "@/features/reflect/components/states/error-state";
import { EscalationState } from "@/features/reflect/components/states/escalation-state";
import { GaveUpState } from "@/features/reflect/components/states/gave-up-state";
import { MirrorState } from "@/features/reflect/components/states/mirror-state";
import { PathSelectionState } from "@/features/reflect/components/states/path-selection-state";
import { ProcessingState } from "@/features/reflect/components/states/processing-state";
import { ComposeScreen } from "@/features/reflect/compose/compose-screen";
import { DictationUpsellDialog } from "@/features/reflect/compose/dictation-upsell-dialog";
import { MAX_TURNS } from "@/features/reflect/hooks/reflection-reducer";
import { useReflectBridge } from "@/features/reflect/hooks/use-reflect-bridge";
import { useReflectionMachine } from "@/features/reflect/hooks/use-reflection-machine";
import { useReplySeed } from "@/features/reflect/hooks/use-reply-seed";
import { useScreenTransition } from "@/features/reflect/hooks/use-screen-transition";
import {
	DEFAULT_SCREEN_TRANSITION,
	SCREEN_TRANSITIONS,
} from "@/features/reflect/reflect-transitions";
import type { ReflectionStateName } from "@/features/reflect/types";
import { TalkDoorDialog, useTalkDoor } from "@/features/talk/talk-door";
import { computeQuietReturn } from "@/helpers/utils/user-variant";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";

const EASE_ANIMATE_OUT = { opacity: 0 };

const WASH_FADE_IN = FadeIn.duration(300);
// Matches SCREEN_TRANSITIONS.typing.exit so the wash leaves with the card.
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
	const crisisTint = useThemeColor("warning") as string;

	// Shake-to-feedback is suppressed only during active articulation.
	useFeedbackShake({
		enabled:
			state.screen !== "typing" &&
			state.screen !== "typing-nudge" &&
			state.screen !== "processing",
	});
	// A reply the user chose to start from (#316): the card's line, never the input's contents.
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

	// Derived, so leaving clarify for any reason closes the sheet instead of
	// stranding it over another screen.
	const mirrorFeedbackOpen =
		mirrorFeedbackTurn !== null &&
		current === "clarify" &&
		!isTransitioning &&
		sessionId !== null;

	const [prevScreen, setPrevScreen] = useState(state.screen);
	// The last compose screen the reducer was on. The outgoing compose copy keeps
	// reading as it, or a collapsed idle card would expand for its fade-out.
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
		// Idle starts a session: re-arm the one-per-session feedback sheet, since the
		// screen stays mounted across sessions.
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
			// idle normalizes to typing (#256): one compose screen renders both, reading
			// which from state.screen, not `screen`.
			case "idle":
			case "typing":
			case "typing-nudge":
				return (
					<ComposeScreen
						dispatch={dispatch}
						entryText={state.entryText}
						// The outgoing copy must not pull focus from the arriving screen.
						focusOnExpand={!isOutgoing}
						isRecording={isRecording}
						onDismiss={() => {
							// Closing the composer spends the offer; the draft survives (#258).
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
						// Armed, not open: autoFocus would raise the keyboard under the sheet.
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

	// Outgoing first so the arriving screen paints on top. Keyed by screen name so
	// a screen turning outgoing keeps its React instance and settled layout.
	const screens = [...outgoing, current];

	// The same box the settled screen fills (`bottom: 0`: the host pads only the
	// top). Any difference reflows the outgoing screen at t=0.
	const absoluteFill: ViewStyle = {
		bottom: 0,
		left: 0,
		position: "absolute",
		right: 0,
		top: insets.top,
	};

	// `current` is `typing` for both idle and composing (#256), so the header
	// follows the reducer's state and hides the moment the composer opens.
	const isIdle = state.screen === "idle";
	// The wash fades out on the same clock as the outgoing compose screen.
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
					// Absolute children ignore the host's safe-area padding: edge to edge.
					style={StyleSheet.absoluteFill}
				>
					<ReflectWash />
				</Animated.View>
			)}
			{/* Mounted, not `hidden`: on Android a hidden toolbar button's host view still
			    eats touches (it swallowed the typing screen's mic and close). Down while the
			    idle menu is open too, since its scrim cannot cover the native header. */}
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
					// EaseView animates `animate` changes on the same native view and emits
					// onTransitionEnd once settled, so the exit is a prop change, not a remount.
					<EaseView
						animate={isOutgoing ? EASE_ANIMATE_OUT : config.enter.animate}
						initialAnimate={config.enter.initialAnimate}
						key={screen}
						onTransitionEnd={
							isOutgoing
								? // A batch cut short by a newer one reports finished: false.
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

			<ClarifyFeedbackSheet
				isOpen={mirrorFeedbackOpen}
				onClose={() => setMirrorFeedbackTurn(null)}
				onPick={(reason) => dispatch({ reason, type: "MISS_REASON" })}
				sessionId={sessionId}
				turnIndex={mirrorFeedbackTurn ?? 0}
			/>

			<DictationUpsellDialog {...dictationUpsell} />
			<TalkDoorDialog door={talkDoor} />

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
