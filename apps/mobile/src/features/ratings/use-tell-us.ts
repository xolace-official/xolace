import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { playAffirmativePress } from "@/lib/haptics";
import { useSingleFlight } from "@/lib/use-single-flight";
import { useAppStore } from "@/store/store";
import { TELL_US_COPY as C } from "./copy";
import { canSend, sendRefusedAsLimited } from "./ratings-model";
import type { TellUs } from "./tell-us-data";

export function useTellUs(): TellUs {
	const posthog = usePostHog();
	const submit = useMutation(api.feedback.submit);
	const canSubmit = useQuery(api.feedback.canSubmitGeneral);
	const setRatings = useAppStore((s) => s.setRatings);
	const [text, setText] = useState("");
	const [sent, setSent] = useState(false);
	const sending = useSingleFlight();
	const limited = canSubmit === false && !sent && !sending.busy;

	const send = async () => {
		if (limited || !canSend(text)) {
			return;
		}
		await sending.run(async () => {
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
			} catch (error) {
				toast(sendRefusedAsLimited(error, canSubmit) ? C.limited : C.failed, {
					variant: "danger",
				});
			}
		});
	};

	return {
		actions: {
			close: () => router.back(),
			send: () => {
				send().catch(() => undefined);
			},
			setText,
		},
		state: { limited, sending: sending.busy, sent, text },
	};
}
