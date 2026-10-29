/** The intake questionnaire (T5, #265), paged internally: forward-only, so the step cursor is
 * state and a cold kill restarts it. */

import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import type { QuestionnaireAnswers } from "@/components/ui/questionnaire";
import {
	type IntakeStepKey,
	trackPaywallSkipped,
	trackQuestionAnswered,
	trackQuestionnaireCompleted,
	trackStepViewed,
} from "@/features/intake/analytics";
import { suggestHandle } from "@/features/intake/answer-rules";
import { BeatStep } from "@/features/intake/questionnaire/beat-step";
import { CompoundingStep } from "@/features/intake/questionnaire/compounding-step";
import { CountStep } from "@/features/intake/questionnaire/count-step";
import { FindingStep } from "@/features/intake/questionnaire/finding-step";
import { IntakeBlank } from "@/features/intake/questionnaire/intake-screen";
import {
	PrivacyStep,
	ShakeStep,
} from "@/features/intake/questionnaire/interstitials";
import {
	MASCOT_WAVE,
	MASCOT_WRITING,
} from "@/features/intake/questionnaire/mascot";
import { NameStep } from "@/features/intake/questionnaire/name-step";
import {
	CarryStep,
	YouStep,
} from "@/features/intake/questionnaire/section-steps";
import { useIntakeComplete } from "@/features/intake/use-intake-complete";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useFullContext } from "@/lib/convex/use-full-context";
import type { IntakeAnswers } from "@/store/intake-slice";
import { useAppStore } from "@/store/store";

type Step =
	| "name"
	| "hey"
	| "you"
	| "noted"
	| "privacy"
	| "carry"
	| "compounding"
	| "shake"
	| "finding"
	| "count";

/** Steps this screen owns a funnel entry for (T7 §2.3); section screens fire their own
 * per-question steps. */
const STEP_KEYS: Partial<Record<Step, IntakeStepKey>> = {
	name: "username",
	privacy: "interstitial_privacy",
	shake: "interstitial_feedback_awareness",
};

/** Q11 is held as a Yes/No string; the mutation takes a boolean. */
function toIntakeAnswers(answers: QuestionnaireAnswers): IntakeAnswers {
	const { seriesWantInApp, ...rest } = answers;
	return {
		...rest,
		...(seriesWantInApp === undefined
			? {}
			: { seriesWantInApp: seriesWantInApp === "true" }),
	} as IntakeAnswers;
}

export default function IntakeQuestionnaire() {
	const router = useRouter();
	const [step, setStep] = useState<Step>("name");
	// Local, not from the store: the store's copy is the submission payload.
	const [name, setName] = useState("");
	const setIntakeAnswers = useAppStore((s) => s.setIntakeAnswers);

	// An existing user already has a name; Q1 pre-fills from it.
	const context = useFullContext();
	const { isPlus } = usePlusEntitlement();
	const completeIntake = useIntakeComplete();
	const finishing = useRef(false);
	const finalAnswers = useRef<QuestionnaireAnswers | null>(null);

	const posthog = usePostHog();
	const completed = useRef(false);
	useEffect(() => {
		const key = STEP_KEYS[step];
		if (key) {
			trackStepViewed(posthog, key);
		}
	}, [step, posthog]);

	const recordAndAdvance = (answers: QuestionnaireAnswers, next: Step) => {
		setIntakeAnswers(toIntakeAnswers(answers));
		setStep(next);
	};

	// The entitlement skip lives here (T4, #235): a payer still gets the
	// questions, never the offer. `isPlus` can resolve late; the offer screen
	// catches that behind a blank frame rather than an inert Done here.
	const finish = (answers: QuestionnaireAnswers) => {
		if (finishing.current) {
			return;
		}
		finishing.current = true;
		setIntakeAnswers(toIntakeAnswers(answers));
		// Read back from the store so the event carries the whole set, Q1 included.
		// Own latch: the one above comes off after a failed write.
		if (!completed.current) {
			completed.current = true;
			trackQuestionnaireCompleted(
				posthog,
				useAppStore.getState().intakeAnswers
			);
		}
		if (!isPlus) {
			router.replace("/(intake)/paywall");
			return;
		}
		trackPaywallSkipped(posthog);
		// `completeIntake` swallows a failed write, so the latch must come off or
		// Done is inert for the rest of the flow.
		void completeIntake("skipped_paywall").finally(() => {
			finishing.current = false;
		});
	};

	switch (step) {
		case "name": {
			// Held until the query answers so a saved name is never replaced by a suggestion.
			if (context === undefined) {
				return <IntakeBlank />;
			}
			const saved = context.preferences?.displayName;
			return (
				<NameStep
					initialName={saved || suggestHandle()}
					onDone={(displayName, edited) => {
						// The handle never leaves the device, only whether it was kept
						// (T7 §2.3). `had_saved_name` separates a saved name from a suggestion.
						trackQuestionAnswered(
							posthog,
							"username",
							edited ? "edited" : "accepted_suggested",
							{
								had_saved_name: !!saved,
							}
						);
						setName(displayName);
						recordAndAdvance({ displayName }, "hey");
					}}
				/>
			);
		}
		case "hey":
			return (
				<BeatStep
					line={`Hey, ${name}.`}
					mascot={MASCOT_WAVE}
					onDone={() => setStep("you")}
					subline="That's the only name anyone here sees."
				/>
			);
		case "you":
			return (
				<YouStep onDone={(answers) => recordAndAdvance(answers, "noted")} />
			);
		case "noted":
			return (
				<BeatStep
					line="Noted."
					mascot={MASCOT_WRITING}
					onDone={() => setStep("privacy")}
				/>
			);
		case "privacy":
			return <PrivacyStep onDone={() => setStep("carry")} />;
		case "carry":
			return (
				<CarryStep
					onDone={(answers) => recordAndAdvance(answers, "compounding")}
				/>
			);
		case "compounding":
			return <CompoundingStep onDone={() => setStep("shake")} />;
		case "shake":
			return <ShakeStep onDone={() => setStep("finding")} />;
		case "finding":
			return (
				<FindingStep
					onDone={(answers) => {
						finalAnswers.current = answers;
						recordAndAdvance(answers, "count");
					}}
				/>
			);
		case "count":
			// The count reads real numbers, so it never submits: a slow stats read
			// must not hold the answers hostage. They are already in the store.
			return <CountStep onDone={() => finish(finalAnswers.current ?? {})} />;
	}
}
