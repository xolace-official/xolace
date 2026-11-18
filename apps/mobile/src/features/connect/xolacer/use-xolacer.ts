import * as Sentry from "@sentry/react-native";
/**
 * A Xolacer's profile on Convex: `xolacerProfile`, the ask flow (age gate, primer, request,
 * Kindling twig), rating, report and block, and the ways on. Production's behaviour and events.
 */
import { api } from "@xolace/backend/api";
import { isSpecialty } from "@xolace/backend/convex/lib/specialties";
import type { Id } from "@xolace/backend/dataModel";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import { deviceClock } from "../device-clock";
import { THREAD } from "../thread/copy";
import type { ReportTo } from "../thread/thread-data";
import { useAskFlow } from "./use-ask-flow";
import type { XolacerRoute, XolacerScreenData } from "./xolacer-data";
import { xolacerState } from "./xolacer-model";

export function useXolacer(
	route: XolacerRoute,
	reportTo: ReportTo
): XolacerScreenData {
	const router = useRouter();
	const profileId = route.profileId as Id<"emotional_profiles">;
	const profile = useQuery(api.xolacerChat.xolacerProfile, {
		xolacerProfileId: profileId,
	});
	const block = useAction(api.xolacerChat.blockConversation);
	const [confirming, setConfirming] = useState(false);
	const [blocking, setBlocking] = useState(false);
	const ask = useAskFlow({
		displayName: profile?.displayName ?? "",
		stepId: route.stepId as Id<"path_steps"> | undefined,
		xolacerProfileId: profileId,
	});
	const conversation = profile?.conversation ?? null;
	const specialty = isSpecialty(route.specialty) ? route.specialty : null;

	const actions: XolacerScreenData["actions"] = {
		ask: ask.handleAsk,
		askBlock: () => {
			playSoftPress();
			setConfirming(true);
		},
		cancelBlock: () => {
			if (!blocking) {
				setConfirming(false);
			}
		},
		closePrimer: ask.handlePrimerClose,
		confirmBlock: () => {
			if (blocking || !conversation) {
				return;
			}
			setBlocking(true);
			block({ conversationId: conversation.id })
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
				.finally(() => setBlocking(false));
		},
		confirmPrimer: ask.handlePrimerConfirm,
		edit: () => {
			playSoftPress();
			router.push("/xolacer-edit");
		},
		openChat: () => {
			if (conversation) {
				playSoftPress();
				ask.openThread(conversation.id);
			}
		},
		openPrimer: ask.openPrimerReference,
		// The roster narrowed to the same specialty, back on the tab under this screen.
		others: () => {
			if (specialty) {
				playSoftPress();
				router.dismissTo({ params: { specialty }, pathname: "/connect" });
			}
		},
		rate: () => {
			if (conversation) {
				playSoftPress();
				router.push({
					params: { conversationId: conversation.id },
					pathname: "/rate/[conversationId]",
				});
			}
		},
		// A report from a profile is about the person, not an exchange: no conversation.
		report: () => {
			if (profile) {
				playSoftPress();
				reportTo({ name: profile.displayName, profileId });
			}
		},
	};

	return {
		actions,
		ageGate: ask.ageGate,
		state: xolacerState({
			blocking: { open: confirming, pending: blocking },
			locale: deviceClock().locale,
			now: Date.now(),
			primer: ask.primerMode,
			profile,
			sending: ask.sending,
			specialty: route.specialty,
		}),
	};
}
