// Intake v2 ("Talk to Flux", #704) on screen: the reducer's step, drawn. The typed (#707) or
// spoken (#709) answer is read by Flux (#708): chips, one follow-up, or crisis support. Then
// the name, and Xolace+ once (#713).
import { usePostHog } from "posthog-react-native";
import { useEffect, useReducer, useRef } from "react";
import {
	trackAnswerGiven,
	trackFollowUpShown,
	trackHeardConfirmed,
	trackReadFallback,
	trackSafetyRouted,
} from "@/features/intake/analytics";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { AskStep } from "@/features/intake/v2/ask-step";
import { FollowUpStep } from "@/features/intake/v2/follow-up-step";
import { chipChanges } from "@/features/intake/v2/heard";
import { HeardStep } from "@/features/intake/v2/heard-step";
import { InterpretStep } from "@/features/intake/v2/interpret-step";
import { ListenStep } from "@/features/intake/v2/listen-step";
import {
	initialIntakeV2State,
	intakeV2Reducer,
	micOn,
	voiceAnswer,
} from "@/features/intake/v2/machine";
import { NameStep } from "@/features/intake/v2/name-step";
import { PlusStep } from "@/features/intake/v2/plus/plus-step";
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

	// One read per arrival at `interpret`; a result after unmount is dropped.
	useEffect(() => {
		if (state.step !== "interpret") {
			return;
		}
		let live = true;
		const read = async () => {
			const outcome = await readAnswer(state);
			if (!live) {
				return;
			}
			if ("fallback" in outcome) {
				trackReadFallback(posthog, outcome.fallback);
				dispatch({ type: "READ_FAILED" });
				return;
			}
			if (outcome.reading.route === "safety") {
				trackSafetyRouted(posthog, outcome.reading.safeguardLevel);
			}
			dispatch({ reading: outcome.reading, type: "READ_DONE" });
		};
		void read();
		return () => {
			live = false;
		};
		// `state` is read as it arrives at `interpret`; nothing changes it until the read lands.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.step]);

	// The reducer decides whether the follow-up is asked; this only records that it was.
	useEffect(() => {
		if (state.step === "followUp" && state.followUp) {
			trackFollowUpShown(posthog, state.followUp.field);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.step]);

	// One write per arrival at `done`; a failure hands the name step back.
	const writing = useRef(false);
	useEffect(() => {
		if (state.step !== "done" || writing.current) {
			return;
		}
		writing.current = true;
		const write = async () => {
			const written = await complete(state);
			writing.current = false;
			if (!written) {
				dispatch({ type: "COMPLETE_FAILED" });
			}
		};
		void write();
		// `state` is read at the moment it reaches `done`; nothing after that changes it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.step]);

	// Xolace+ is its own screen, after the three stops the bar counts. `done` stays on the
	// screen the save left from, busy, until it lands.
	const offering =
		state.step === "plus" || (state.step === "done" && state.plusShown);

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
								chipChanges(state.readAs, state.heard)
							);
							dispatch({ type: "CONFIRM_HEARD" });
						}}
						onSayAgain={() => dispatch({ type: "SAY_AGAIN" })}
						onToggle={(chip) => dispatch({ ...chip, type: "TOGGLE_CHIP" })}
						read={state.read}
						readAs={state.readAs}
					/>
				);
			case "plus":
				return (
					<PlusStep
						busy={false}
						onExit={(outcome) => dispatch({ outcome, type: "PLUS_EXIT" })}
					/>
				);
			case "name":
			case "done":
				return offering ? (
					<PlusStep busy onExit={() => undefined} />
				) : (
					<NameStep
						busy={state.step === "done"}
						name={state.name}
						onChange={(name) => dispatch({ name, type: "NAME_CHANGE" })}
						// An unresolved entitlement reads as free; `plus` steps aside once it resolves.
						onKeep={() => dispatch({ entitled: isPlus, type: "KEEP_NAME" })}
						skipped={state.mode === "skipped"}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<IntakeScreen>
			{!offering && <IntakeV2Progress step={state.step} />}
			{body()}
		</IntakeScreen>
	);
}
