import { usePostHog } from "posthog-react-native";
import { useEffect, useEffectEvent, useReducer, useRef } from "react";
import {
	trackAnswerGiven,
	trackFollowUpShown,
	trackHeardConfirmed,
	trackReadFallback,
	trackSafetyLate,
	trackSafetyRouted,
} from "@/features/intake/analytics";
import { FirstLookStep } from "@/features/intake/first-look/first-look-step";
import { AskStep } from "@/features/intake/v2/ask-step";
import { FollowUpStep } from "@/features/intake/v2/follow-up-step";
import {
	chipChanges,
	type Reading,
	suggestionCount,
	suggestionsTaken,
} from "@/features/intake/v2/heard";
import { HeardStep } from "@/features/intake/v2/heard-step";
import { IntakeScreen } from "@/features/intake/v2/intake-screen";
import { InterpretStep } from "@/features/intake/v2/interpret-step";
import { ListenStep } from "@/features/intake/v2/listen-step";
import {
	firstAnswerToOffer,
	initialIntakeV2State,
	intakeV2Reducer,
	micOn,
	voiceAnswer,
} from "@/features/intake/v2/machine";
import { NameStep } from "@/features/intake/v2/name-step";
import { IntakeV2Progress } from "@/features/intake/v2/progress";
import { SafetyStep } from "@/features/intake/v2/safety-step";
import { TypeStep } from "@/features/intake/v2/type-step";
import { useIntakeV2Complete } from "@/features/intake/v2/use-intake-v2-complete";
import { useReadFirstAnswer } from "@/features/intake/v2/use-read-first-answer";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";

export function IntakeV2Flow({ initialName }: { initialName: string }) {
	const [state, dispatch] = useReducer(
		intakeV2Reducer,
		initialName,
		initialIntakeV2State
	);
	const posthog = usePostHog();
	const complete = useIntakeV2Complete();
	const readAnswer = useReadFirstAnswer();
	const { isPlus } = usePlusEntitlement();

	const onLateRead = useEffectEvent((reading: Reading | null) => {
		if (reading?.route !== "safety" || state.safetyRouted) {
			return;
		}
		trackSafetyLate(posthog, reading.safeguardLevel, state.step);
		dispatch({ resources: reading.resources, type: "LATE_SAFETY" });
	});

	const startRead = useEffectEvent(() => readAnswer(state));
	const onRead = useEffectEvent(
		(outcome: Awaited<ReturnType<typeof readAnswer>>) => {
			if ("fallback" in outcome) {
				trackReadFallback(posthog, outcome.fallback);
				dispatch({ type: "READ_FAILED" });
				if ("late" in outcome) {
					void outcome.late.then((reading) => onLateRead(reading));
				}
				return;
			}
			if (outcome.reading.route === "safety") {
				trackSafetyRouted(posthog, outcome.reading.safeguardLevel);
			}
			dispatch({ reading: outcome.reading, type: "READ_DONE" });
		}
	);
	// Reads the first answer on arrival at `interpret`, from the state it arrived with.
	useEffect(() => {
		if (state.step !== "interpret") {
			return;
		}
		let live = true;
		void startRead().then((outcome) => {
			if (live) {
				onRead(outcome);
			}
		});
		return () => {
			live = false;
		};
	}, [state.step]);

	// `followUp` is set only together with the step (FRESH_READ), so this fires once per arrival.
	useEffect(() => {
		if (state.step === "followUp" && state.followUp) {
			trackFollowUpShown(posthog, state.followUp.field);
		}
	}, [posthog, state.step, state.followUp]);

	const writing = useRef(false);
	const write = useEffectEvent(async () => {
		const written = await complete(state);
		writing.current = false;
		if (!written) {
			dispatch({ type: "COMPLETE_FAILED" });
		}
	});
	// Saves on arrival at `done`; `writing` keeps a re-render from saving twice.
	useEffect(() => {
		if (state.step !== "done" || writing.current) {
			return;
		}
		writing.current = true;
		void write();
	}, [state.step]);

	const offering =
		state.step === "plus" ||
		(state.step === "done" && state.plusShown && !state.safetyRouted);

	const onStoreCall = (active: boolean) =>
		dispatch({ active, type: "STORE_CALL" });

	const body = () => {
		switch (state.step) {
			case "ask":
				return (
					<AskStep
						onQuickReply={(text) => {
							trackAnswerGiven(posthog, "quick_reply", text);
							dispatch({ text, type: "QUICK_REPLY" });
						}}
						onSkip={() => {
							trackAnswerGiven(posthog, "skipped", "");
							dispatch({ type: "SKIP" });
						}}
						onTalk={() => dispatch({ type: "START_LISTENING" })}
						onType={() => dispatch({ type: "START_TYPING" })}
					/>
				);
			case "listen":
				return (
					<ListenStep
						onDone={(transcript) => {
							const answer = voiceAnswer(transcript);
							if (answer) {
								trackAnswerGiven(posthog, "voice", answer);
							}
							dispatch({ transcript, type: "LISTEN_DONE" });
						}}
						onUnavailable={(reason) =>
							dispatch({ reason, type: "MIC_UNAVAILABLE" })
						}
					/>
				);
			case "type":
				return (
					<TypeStep
						draft={state.draft}
						listenFailed={state.listenFailed}
						onChange={(text) => dispatch({ text, type: "DRAFT_CHANGE" })}
						onSend={() => {
							trackAnswerGiven(posthog, "typed", state.draft.trim());
							dispatch({ type: "SEND" });
						}}
						onTalk={
							micOn(state) ? () => dispatch({ type: "START_LISTENING" }) : null
						}
					/>
				);
			case "interpret":
				return (
					<InterpretStep
						words={
							state.followUpReply === null ? state.answer : state.followUpReply
						}
					/>
				);
			case "followUp":
				return (
					<FollowUpStep
						draft={state.followUpDraft}
						onChange={(text) =>
							dispatch({ text, type: "FOLLOW_UP_DRAFT_CHANGE" })
						}
						onSend={() => dispatch({ type: "FOLLOW_UP_SEND" })}
						onSkip={() => dispatch({ type: "FOLLOW_UP_SKIP" })}
						question={state.followUp?.question ?? ""}
					/>
				);
			case "safety":
				return (
					<SafetyStep
						onContinue={() => dispatch({ type: "SAFETY_CONTINUE" })}
						resources={state.resources}
					/>
				);
			case "heard":
				return (
					<HeardStep
						answer={state.answer}
						heard={state.heard}
						onConfirm={() => {
							trackHeardConfirmed(
								posthog,
								state.read ?? "pick_list",
								chipChanges(state.readAs, state.heard),
								{
									shown: suggestionCount(state.suggested),
									taken: suggestionsTaken(state.suggested, state.heard),
								}
							);
							dispatch({ type: "CONFIRM_HEARD" });
						}}
						onSayAgain={() => dispatch({ type: "SAY_AGAIN" })}
						onToggle={(chip) => dispatch({ ...chip, type: "TOGGLE_CHIP" })}
						read={state.read}
						readAs={state.readAs}
						suggested={state.suggested}
					/>
				);
			case "name":
			case "done":
				return (
					<NameStep
						busy={state.step === "done"}
						name={state.name}
						onChange={(name) => dispatch({ name, type: "NAME_CHANGE" })}
						onKeep={() => dispatch({ entitled: isPlus, type: "KEEP_NAME" })}
						skipped={state.mode === "skipped"}
					/>
				);
			default:
				return null;
		}
	};

	if (offering) {
		const busy = state.step === "done";
		return (
			<FirstLookStep
				answer={firstAnswerToOffer(state)}
				busy={busy}
				onExit={(outcome) => busy || dispatch({ outcome, type: "PLUS_EXIT" })}
				onSafetyExit={(outcome) =>
					busy || dispatch({ outcome, type: "PLUS_SAFETY_EXIT" })
				}
				onStoreCall={onStoreCall}
			/>
		);
	}
	return (
		<IntakeScreen>
			<IntakeV2Progress step={state.step} />
			{body()}
		</IntakeScreen>
	);
}
