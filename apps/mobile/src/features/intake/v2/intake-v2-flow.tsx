// Intake v2 ("Talk to Flux", #704) on screen: the reducer's step, drawn. This ticket (#707)
// wires the typed answer: ask, type, heard as a pick-list, name, done. `listen`, `followUp`,
// `safety` and `plus` exist in the machine but nothing reaches them yet.
import { usePostHog } from "posthog-react-native";
import { useEffect, useReducer, useRef } from "react";
import {
	trackAnswerGiven,
	trackHeardConfirmed,
} from "@/features/intake/analytics";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { AskStep } from "@/features/intake/v2/ask-step";
import { chipChanges, NOTHING_HEARD } from "@/features/intake/v2/heard";
import { HeardStep } from "@/features/intake/v2/heard-step";
import {
	initialIntakeV2State,
	intakeV2Reducer,
} from "@/features/intake/v2/machine";
import { NameStep } from "@/features/intake/v2/name-step";
import { IntakeV2Progress } from "@/features/intake/v2/progress";
import { TypeStep } from "@/features/intake/v2/type-step";
import { useIntakeV2Complete } from "@/features/intake/v2/use-intake-v2-complete";

export function IntakeV2Flow({ initialName }: { initialName: string }) {
	const [state, dispatch] = useReducer(
		intakeV2Reducer,
		initialName,
		initialIntakeV2State
	);
	const posthog = usePostHog();
	const complete = useIntakeV2Complete();

	// No model call yet: reading "fails" at once, into the pick-list the finished flow falls
	// back to on a timeout or error.
	useEffect(() => {
		if (state.step === "interpret") {
			dispatch({ type: "READ_FAILED" });
		}
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
						onType={() => dispatch({ type: "START_TYPING" })}
					/>
				);
			case "type":
				return (
					<TypeStep
						draft={state.draft}
						onChange={(text) => dispatch({ text, type: "DRAFT_CHANGE" })}
						onSend={() => {
							trackAnswerGiven(posthog, "typed", state.draft.trim());
							dispatch({ type: "SEND" });
						}}
					/>
				);
			case "heard":
				return (
					<HeardStep
						answer={state.answer}
						heard={state.heard}
						onConfirm={() => {
							// The pick-list starts with nothing on; a reading will start from its own.
							trackHeardConfirmed(
								posthog,
								state.read ?? "pick_list",
								chipChanges(NOTHING_HEARD, state.heard)
							);
							dispatch({ type: "CONFIRM_HEARD" });
						}}
						onSayAgain={() => dispatch({ type: "SAY_AGAIN" })}
						onToggle={(chip) => dispatch({ ...chip, type: "TOGGLE_CHIP" })}
						read={state.read}
					/>
				);
			case "name":
			case "done":
				return (
					<NameStep
						busy={state.step === "done"}
						name={state.name}
						onChange={(name) => dispatch({ name, type: "NAME_CHANGE" })}
						onKeep={() => dispatch({ type: "KEEP_NAME" })}
						skipped={state.mode === "skipped"}
					/>
				);
			default:
				// `interpret` for the one frame before READ_FAILED, and the stubbed steps.
				return null;
		}
	};

	return (
		<IntakeScreen>
			<IntakeV2Progress step={state.step} />
			{body()}
		</IntakeScreen>
	);
}
