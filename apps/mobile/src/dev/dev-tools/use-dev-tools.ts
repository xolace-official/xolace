import { useAuth } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { useAppStore } from "@/store/store";

export type FollowUpTier = "acute" | "elevated" | "standard";

const NOT_ENABLED = "Is DEV_TOOLS_ENABLED set?";
const why = (e: unknown) => (e instanceof Error ? e.message : NOT_ENABLED);
const failed = (message: string) => (e: unknown) =>
	toast(message, { description: why(e), variant: "danger" });

export function useDevTools() {
	const { userId } = useAuth();
	const setStreak = useMutation(api.devTools.setStreak);
	const seedFollowUpCard = useMutation(api.devTools.seedFollowUpCard);
	const resetIntake = useMutation(api.devTools.resetIntake);
	const clearDeferredAnswers = useMutation(api.devTools.clearDeferredAnswers);
	const clearAgeDeclarations = useMutation(api.devTools.clearAgeDeclarations);
	const seedBadgeUnlock = useMutation(api.devTools.seedBadgeUnlock);
	const [busy, setBusy] = useState(false);

	const once = (run: () => Promise<unknown>) => {
		if (busy) {
			return;
		}
		setBusy(true);
		run().finally(() => setBusy(false));
	};

	return {
		clearAgeGate: () =>
			clearAgeDeclarations()
				.then(() =>
					toast("Date of birth cleared", {
						description: "The next Ask to talk asks for a date of birth again.",
					})
				)
				.catch(failed("Clearing the date of birth failed")),
		openDevStates: () => router.push("/dev"),
		replayBadge: () =>
			seedBadgeUnlock().catch(failed("Badge unlock replay failed")),
		replayDeferred: () =>
			clearDeferredAnswers()
				.then(() => {
					useAppStore.setState({ shakeHintSeen: false });
					if (userId) {
						useAppStore
							.getState()
							.clearAccountFlags(userId, ["findingCardDismissed"]);
					}
					toast("Deferred questions cleared", {
						description:
							"The how-you-found-us card waits for day 3. Coping, frequency and the reminder aren't asked anywhere since the session end's redesign.",
					});
				})
				.catch(failed("Deferred questions replay failed")),
		replayIntake: () =>
			once(() => resetIntake().catch(failed("Intake reset failed"))),
		resetAwareness: () => {
			useAppStore.setState({ seenEventIds: [] });
			useAppStore.getState().setPendingEventPrompt(null);
			toast("Awareness events reset", {
				description: "Reopen Today to see this month's prompt.",
			});
		},
		runStreak: (mode: "bump" | "reset") =>
			once(() =>
				setStreak({ mode })
					.then((streak) => toast(`Streak set to day ${streak}`))
					.catch(() =>
						toast("Streak update failed", {
							description: "Is DEV_TOOLS_ENABLED set on this deployment?",
							variant: "danger",
						})
					)
			),
		seedFollowUp: (tier: FollowUpTier) =>
			once(() =>
				seedFollowUpCard({ tier })
					.then(() =>
						toast(`Follow-up card seeded · ${tier}`, {
							description: "Reopen Today for the greeting, or find it in You.",
						})
					)
					.catch(failed("Seed failed"))
			),
		sentryTest: () => Sentry.captureException(new Error("Sentry test error")),
	};
}
