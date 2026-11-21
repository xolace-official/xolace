import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import { useSingleFlight } from "@/lib/use-single-flight";
import { CLIENT_VERSION, useAgeGate } from "../age-gate/use-age-gate";
import {
	acceptFailureLabel,
	CHAT_HELP_HREF,
	chatLimitError,
} from "../chat-rules";
import { THREAD } from "./copy";
import type { ReportTo, ThreadScreenData } from "./thread-data";
import type { ThreadConversation } from "./thread-model";

const SEEKER_OPEN_CAP = 3;

export function useThreadActions(
	conversation: ThreadConversation | null | undefined,
	reportTo: ReportTo
) {
	const router = useRouter();
	const accept = useAction(api.xolacerChat.acceptRequest);
	const decline = useMutation(api.xolacerChat.declineRequest);
	const resume = useMutation(api.xolacerChat.resumeConversation);
	const block = useAction(api.xolacerChat.blockConversation);
	const ageGate = useAgeGate();
	const [confirming, setConfirming] = useState(false);
	const blocking = useSingleFlight();
	const answering = useSingleFlight();
	const resuming = useSingleFlight();
	const answer = (call: () => Promise<unknown>) => {
		void answering.run(async () => {
			await call();
		});
	};
	const c = conversation;

	const resumeNow = () => {
		if (!c) {
			return;
		}
		void resuming.run(() =>
			resume({ clientVersion: CLIENT_VERSION, conversationId: c.id })
				.then((result) => {
					if (!result.resumed) {
						toast(THREAD.toast.resumeQuiet);
					}
				})
				.catch((error: unknown) => {
					if (ageGate.handleRefusal(error, resumeNow)) {
						return;
					}
					const limit = chatLimitError(error);
					toast(
						limit?.code === "open_conversation_limit"
							? THREAD.toast.resumeLimit(limit.max ?? SEEKER_OPEN_CAP)
							: THREAD.toast.resumeFailed,
						{ variant: "danger" }
					);
				})
		);
	};

	const actions: Omit<ThreadScreenData["actions"], "retry" | "flag"> = {
		accept: () => {
			if (!c || answering.isBusy()) {
				return;
			}
			playSoftPress();
			answer(() =>
				accept({ conversationId: c.id }).catch((error: unknown) =>
					toast(acceptFailureLabel(error), { variant: "danger" })
				)
			);
		},
		askBlock: () => {
			playSoftPress();
			setConfirming(true);
		},
		cancelBlock: () => {
			if (!blocking.busy) {
				setConfirming(false);
			}
		},
		confirmBlock: () => {
			if (!c) {
				return;
			}
			void blocking.run(() =>
				block({ conversationId: c.id })
					.then(() => {
						setConfirming(false);
						router.back();
					})
					.catch((error: unknown) => {
						Sentry.captureException(error, { tags: { action: "block" } });
						setConfirming(false);
						toast(THREAD.toast.blockFailed, {
							description: THREAD.toast.tryAgain,
							variant: "danger",
						});
					})
			);
		},
		decline: () => {
			if (!c || answering.isBusy()) {
				return;
			}
			playSoftPress();
			answer(() =>
				decline({ conversationId: c.id })
					.then(() => router.back())
					.catch(() => toast(THREAD.toast.declineFailed, { variant: "danger" }))
			);
		},
		findAnother: () => {
			playSoftPress();
			router.dismissTo("/connect");
		},
		openHelp: () => {
			playSoftPress();
			router.push(CHAT_HELP_HREF);
		},
		openProfile: () => {
			if (c?.role !== "user") {
				return;
			}
			playSoftPress();
			router.push({
				params: { profileId: c.counterpartProfileId },
				pathname: "/xolacer/[profileId]",
			});
		},
		// No `canOpenURL` first: Android 11+ can't see the dialer without a `<queries>` entry, so
		// a crisis call would be refused before it was tried (Care's rule).
		openResource: (url, failure) => {
			playSoftPress();
			Linking.openURL(url).catch(() => toast(failure, { variant: "warning" }));
		},
		rate: () => {
			if (!c) {
				return;
			}
			playSoftPress();
			router.push({
				params: { conversationId: c.id },
				pathname: "/rate/[conversationId]",
			});
		},
		report: () => {
			if (!c) {
				return;
			}
			playSoftPress();
			reportTo({
				conversationId: c.id,
				name: c.counterpartName,
				profileId: c.counterpartProfileId,
			});
		},
		resume: () => {
			playSoftPress();
			if (c?.role === "user") {
				ageGate.guard(resumeNow);
			} else {
				resumeNow();
			}
		},
	};

	return {
		actions,
		answering: answering.busy,
		blocking: { open: confirming, pending: blocking.busy },
	};
}
