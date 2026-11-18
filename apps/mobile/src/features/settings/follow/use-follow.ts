import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { SOCIAL } from "@/features/settings/follow/copy";
import type { Follow } from "@/features/settings/follow/follow-data";
import {
	canSendFeedback,
	feedbackMailto,
	reviewUrl,
	SENT_CLOSE_MS,
	type SendPhase,
	sendErrorMessage,
} from "@/features/settings/follow/follow-model";

/** Production let a link that fails to open (no mail account) pass silently. */
const openLink = (url: string) => {
	Linking.openURL(url).catch(() => undefined);
};

/** Follow & Support on Convex (`feedback.*`), PostHog and the phone's links. */
export function useFollow(): Follow {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [phase, setPhase] = useState<SendPhase>("idle");
	const [error, setError] = useState<string | null>(null);
	// Production asks only while its dialog is up.
	const canSubmit = useQuery(api.feedback.canSubmitGeneral, open ? {} : "skip");
	const submit = useMutation(api.feedback.submit);
	const posthog = usePostHog();
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const sending = useRef(false);

	const clearTimer = () => {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	};
	useEffect(() => clearTimer, []);

	// Closing forgets the note, as production's dialog did by unmounting its form.
	const close = () => {
		clearTimer();
		setOpen(false);
		setDraft("");
		setPhase("idle");
		setError(null);
	};

	const send = async () => {
		const text = draft.trim();
		if (sending.current || !canSendFeedback({ canSubmit, draft, phase })) {
			return;
		}
		sending.current = true;
		setPhase("busy");
		setError(null);
		try {
			await submit({ text, type: "general" });
			setPhase("sent");
			posthog.capture("feedback_submitted", {
				has_option: false,
				has_text: true,
				type: "general",
			});
			clearTimer();
			closeTimer.current = setTimeout(close, SENT_CLOSE_MS);
		} catch (e) {
			setPhase("idle");
			setError(sendErrorMessage(e));
		}
		sending.current = false;
	};

	return {
		actions: {
			closeFeedback: () => {
				if (!sending.current) {
					close();
				}
			},
			emailUs: () => openLink(feedbackMailto()),
			getHelp: () => router.push("/crisis-resources?from=settings"),
			openFeedback: () => setOpen(true),
			openSocial: (id) => {
				const social = SOCIAL.find((s) => s.id === id);
				if (social) {
					openLink(social.url);
				}
			},
			review: () => openLink(reviewUrl(process.env.EXPO_OS)),
			sendFeedback: () => {
				send().catch(() => undefined);
			},
			setDraft: (text) => {
				setDraft(text);
				setError(null);
			},
		},
		state: { feedback: { canSubmit, draft, error, open, phase } },
	};
}
