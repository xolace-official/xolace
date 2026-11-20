import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { playAffirmativePress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";
import { TELL_US_COPY as C } from "./copy";
import { canSend } from "./ratings-model";
import type { TellUs } from "./tell-us-data";

/**
 * Tell us on Convex: `feedback.submit` with `type: "general"`, which keeps only the words (no
 * name), allows one a day (`feedback.canSubmitGeneral`) and up to 1000 characters. A sent note
 * holds the rating screen until the next release (`noteAt`).
 */
export function useTellUs(): TellUs {
	const posthog = usePostHog();
	const submit = useMutation(api.feedback.submit);
	const canSubmit = useQuery(api.feedback.canSubmitGeneral);
	const setRatings = useAppStore((s) => s.setRatings);
	const [text, setText] = useState("");
	const [sent, setSent] = useState(false);
	const [sending, setSending] = useState(false);
	const busy = useRef(false);
	// A loading limit isn't a limit (the backend still refuses a second note); once sent it's this one.
	const limited = canSubmit === false && !sent && !sending;

	const send = async () => {
		if (busy.current || limited || !canSend(text)) {
			return;
		}
		busy.current = true;
		setSending(true);
		try {
			await submit({ text: text.trim(), type: "general" });
			setRatings({ noteAt: Date.now() });
			posthog.capture("feedback_submitted", {
				has_option: false,
				has_text: true,
				source: "ratings",
				type: "general",
			});
			playAffirmativePress();
			setSent(true);
		} catch {
			toast(canSubmit === false ? C.limited : C.failed, { variant: "danger" });
		} finally {
			busy.current = false;
			setSending(false);
		}
	};

	return {
		actions: {
			close: () => router.back(),
			send: () => {
				send().catch(() => undefined);
			},
			setText,
		},
		state: { limited, sending, sent, text },
	};
}
