import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { goBack } from "@/components/shared/back-button";
import { toast } from "@/components/shared/toast";
import { useStableQuery } from "@/lib/convex/use-stable-query";
import { useAppStore } from "@/store/store";
import { FEEDBACK_COPY } from "./copy";
import type { FeedbackScreen } from "./feedback-data";
import {
	errorMessageOf,
	type FeedbackKind,
	type FeedbackStart,
	type FeedbackStep,
} from "./feedback-model";
import { useFeedbackContext } from "./use-feedback-context";
import {
	hasUnseenWhatsNew,
	LATEST_WHATS_NEW_ID,
} from "./whats-new/whats-new-entries";

/** The sheet's data: which step is up, the form's draft and its send, What's new's seen mark. */
export function useFeedback(
	start: FeedbackStart,
	from: string | undefined
): FeedbackScreen {
	const posthog = usePostHog();
	const context = useFeedbackContext(from);
	const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
	const setLastSeenVersion = useAppStore((s) => s.setLastSeenVersion);
	const [step, setStep] = useState<FeedbackStep>(start.step);
	const [kind, setKind] = useState<FeedbackKind>(
		start.step === "report" ? start.kind : "bug"
	);
	const [text, setText] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const subject = start.step === "report" ? start.subject : undefined;

	const submit = useMutation(api.productFeedback.submit);
	// Stable: a plain `useQuery` returns `undefined` while the new budget loads, which would drop
	// the notice and re-enable Send mid-tap.
	const canSubmit = useStableQuery(
		api.productFeedback.canSubmit,
		step === "report" ? { kind } : "skip"
	);
	const limited = canSubmit === false;

	const send = async () => {
		if (saving || !text.trim() || limited) {
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await submit({
				context,
				conversationId: subject?.conversationId,
				kind,
				subjectProfileId: subject?.profileId,
				text: text.trim(),
			});
			posthog.capture("product_feedback_submitted", { kind });
			toast(FEEDBACK_COPY.report.thanks, {
				description: FEEDBACK_COPY.report[kind].sent,
			});
			goBack();
		} catch (e) {
			setError(errorMessageOf(e));
		} finally {
			setSaving(false);
		}
	};

	return {
		actions: {
			back: () => {
				setStep("menu");
				setError(null);
			},
			openReport: (k) => {
				setKind(k);
				setStep("report");
			},
			openWhatsNew: () => {
				posthog.capture("whats_new_opened");
				if (LATEST_WHATS_NEW_ID) {
					setLastSeenVersion(LATEST_WHATS_NEW_ID);
				}
				setStep("whatsNew");
			},
			send,
			setKind,
			setText: (t) => {
				setText(t);
				setError(null);
			},
		},
		state: {
			canGoBack: start.step === "menu" && step !== "menu",
			error,
			kind,
			limited,
			saving,
			step,
			subjectName: subject?.name ?? null,
			text,
			whatsNewUnseen: hasUnseenWhatsNew(lastSeenVersion),
		},
	};
}
