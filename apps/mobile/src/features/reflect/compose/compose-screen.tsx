import { PressableFeedback } from "heroui-native";
import { useRef } from "react";
import type { TextInputInstance } from "react-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Tour } from "@/components/ui/tour";
import { useSessionMode } from "@/context/session-mode-context";
import {
	DAY_NUDGE_DELAY_MS,
	NIGHT_NUDGE_DELAY_MS,
} from "@/features/night-mode/night-copy";
import { ComposeSurround } from "@/features/reflect/compose/compose-surround";
import { FluxPerch } from "@/features/reflect/compose/flux-perch";
import { MorphCard } from "@/features/reflect/compose/morph-card";
import { useComposeCard } from "@/features/reflect/compose/use-compose-card";
import { useComposeLifecycle } from "@/features/reflect/compose/use-compose-lifecycle";
import { useMorph } from "@/features/reflect/compose/use-morph";
import type { PlusDictationView } from "@/features/reflect/hooks/use-plus-dictation";
import { useReflectTour } from "@/features/reflect/hooks/use-reflect-tour";
import { useTypingPause } from "@/features/reflect/hooks/use-typing-pause";
import type { QuietReturnTier } from "@/features/reflect/quiet-return-copy";
import type {
	ReflectionAction,
	ReflectionStateName,
} from "@/features/reflect/types";
import { playTypingBegin } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useAppStore } from "@/store/store";

type Props = {
	screen: ReflectionStateName;
	quietReturn: QuietReturnTier | null;
	selectedTextures: string[];
	entryText: string;
	dispatch: React.Dispatch<ReflectionAction>;
	onTap: () => void;
	onSubmit: () => void;
	onDismiss: () => void;
	onScaffoldSubmit: () => void;
	onVoiceTapIdle: () => void;
	onVoiceTapTyping: () => void;
	isRecording: boolean;
	plusDictation: PlusDictationView | null;
	spaceName?: string;
	/** False for the outgoing copy during a cross-fade to another state. */
	focusOnExpand?: boolean;
};

/**
 * Idle and composing, as one screen (#256).
 *
 * The reducer still distinguishes `idle`, `typing` and `typing-nudge`; what
 * changed is that none of them mounts a different tree. A single progress value
 * — 0 at rest, 1 composing — is the only thing separating the two readings, so
 * tapping the card opens the page already in front of the user instead of
 * replacing the screen with another one.
 */
export const ComposeScreen = ({
	screen,
	quietReturn,
	selectedTextures,
	entryText,
	dispatch,
	onTap,
	onSubmit,
	onDismiss,
	onScaffoldSubmit,
	onVoiceTapIdle,
	onVoiceTapTyping,
	isRecording,
	plusDictation,
	spaceName,
	focusOnExpand = true,
}: Props) => {
	const { isNight } = useSessionMode();
	const reduceMotion = useEffectiveReducedMotion();

	const expanded = screen !== "idle";
	const showNudge = screen === "typing-nudge";
	const inputRef = useRef<TextInputInstance>(null);

	const { card, nudgeMessage, eventPrompt, eventLabel } = useComposeCard({
		entryText,
		expanded,
		isNight,
		quietReturn,
	});

	const { resetTimer, clearTimer } = useTypingPause(
		() => dispatch({ type: "PAUSE_TIMEOUT" }),
		isNight ? NIGHT_NUDGE_DELAY_MS : DAY_NUDGE_DELAY_MS
	);

	const { progress, fade } = useMorph({
		expanded,
		focusOnExpand,
		inputRef,
		// The nudge is a thing that happens while writing; closing the card ends
		// the sentence, so the pending countdown goes with it.
		onCollapse: clearTimer,
		reduceMotion,
	});

	const { isActive: tourActive, finish, skip, trackStep } = useReflectTour();
	const setReflectTourVersion = useAppStore((s) => s.setReflectTourVersion);

	useComposeLifecycle(focusOnExpand, tourActive, skip);

	const handleTap = () => {
		playTypingBegin();
		onTap();
	};

	const handleChangeText = (text: string) => {
		dispatch({ text, type: "TEXT_CHANGE" });
		if (showNudge) {
			dispatch({ type: "RESUME_TYPING" });
		}
		if (text.length > 0) {
			resetTimer();
		} else {
			clearTimer();
		}
	};

	return (
		<Tour
			onFinish={finish}
			onSkip={skip}
			onStepChange={trackStep}
			open={tourActive}
		>
			<View className="flex-1">
				{/* The card and its mascot live over the page, so their geometry is
            independent of everything around them. The surround renders after,
            so an opened menu is not painted over by the card beneath it. */}
				<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
					<FluxPerch
						expanded={expanded}
						fade={fade}
						progress={progress}
						reduceMotion={reduceMotion}
					/>

					<MorphCard
						card={card}
						entryText={entryText}
						expanded={expanded}
						fade={fade}
						hasDraft={entryText.trim().length > 0}
						inputRef={inputRef}
						isRecording={isRecording}
						nudgeMessage={nudgeMessage}
						onChangeText={handleChangeText}
						onDiscardDraft={() => dispatch({ type: "DISCARD_DRAFT" })}
						onDismiss={onDismiss}
						onOpen={handleTap}
						onSubmit={onSubmit}
						onVoiceTap={onVoiceTapTyping}
						plusDictation={plusDictation}
						progress={progress}
						selectedTextures={selectedTextures}
						showNudge={showNudge}
					/>
				</View>

				<ComposeSurround
					dispatch={dispatch}
					eventLabel={eventLabel}
					eventPrompt={eventPrompt}
					expanded={expanded}
					fade={fade}
					isNight={isNight}
					isRecording={isRecording}
					onScaffoldSubmit={onScaffoldSubmit}
					onVoiceTap={onVoiceTapIdle}
					progress={progress}
					reduceMotion={reduceMotion}
					selectedTextures={selectedTextures}
					spaceName={spaceName}
				/>

				{/* DEV ONLY — tap to restart tour for testing */}
				{__DEV__ && !tourActive && !expanded && (
					<PressableFeedback
						className="absolute right-4 bottom-5 p-3"
						hitSlop={8}
						onPress={() => setReflectTourVersion(0)}
					>
						<AppText className="text-foreground/25 text-xs">↺ tour</AppText>
					</PressableFeedback>
				)}
			</View>
		</Tour>
	);
};
