/**
 * What the thread's bar and menu do: accept, decline, pick back up (behind the age gate for a
 * seeker), block, rate, report, and the ways out. Production's mutations, toasts and haptics.
 */
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
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
	const [blocking, setBlocking] = useState(false);
	// A request is answered once: a second tap while the first is in flight does nothing. The
	// ref guards (state read in this closure can be a render behind a fast second tap); the
	// state is for the buttons, which show the wait.
	const answeringRef = useRef(false);
	const [answering, setAnswering] = useState(false);
	const answer = (call: () => Promise<unknown>) => {
		answeringRef.current = true;
		setAnswering(true);
		call().finally(() => {
			answeringRef.current = false;
			setAnswering(false);
		});
	};
	const c = conversation;

	const resumeNow = () => {
		if (!c) {
			return;
		}
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
			});
	};

	const actions: Omit<ThreadScreenData["actions"], "retry" | "flag"> = {
		accept: () => {
			if (!c || answeringRef.current) {
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
			if (!blocking) {
				setConfirming(false);
			}
		},
		confirmBlock: () => {
			if (blocking || !c) {
				return;
			}
			setBlocking(true);
			block({ conversationId: c.id })
				.then(() => {
					setConfirming(false);
					// The row is gone from the list behind us; nothing here to return to.
					router.back();
				})
				.catch((error: unknown) => {
					Sentry.captureException(error, { tags: { action: "block" } });
					// Closed, not left open: nothing was blocked, and the server is idempotent.
					setConfirming(false);
					toast(THREAD.toast.blockFailed, {
						description: THREAD.toast.tryAgain,
						variant: "danger",
					});
				})
				.finally(() => setBlocking(false));
		},
		decline: () => {
			if (!c || answeringRef.current) {
				return;
			}
			playSoftPress();
			answer(() =>
				decline({ conversationId: c.id })
					.then(() => router.back())
					.catch(() => toast(THREAD.toast.declineFailed, { variant: "danger" }))
			);
		},
		// Back to the tabs under the thread, never a second copy of them.
		findAnother: () => {
			playSoftPress();
			router.dismissTo("/connect");
		},
		openHelp: () => {
			playSoftPress();
			router.push(CHAT_HELP_HREF);
		},
		openProfile: () => {
			// Only a seeker's counterpart has a public profile.
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
		// Picking a resting chat back up restarts it, so a seeker meets the age gate first
		// (#716); the Xolacer's side isn't asked.
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
		answering,
		blocking: { open: confirming, pending: blocking },
	};
}
