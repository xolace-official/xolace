/**
 * What Account › Dev tools does: production's dev rows, moved here from
 * `features/settings` so the ported Settings imports no other feature (S19b).
 * Every Convex call is honoured only on a deployment with DEV_TOOLS_ENABLED.
 */
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

	/** One server call at a time, as production's section did. */
	const once = (run: () => Promise<unknown>) => {
		if (busy) {
			return;
		}
		setBusy(true);
		run().finally(() => setBusy(false));
	};

	const acknowledge = (streak: number) => {
		if (userId) {
			useAppStore.getState().setLastAcknowledgedStreak(streak, userId);
		}
	};

	return {
		/** Arms starter suggestions as a new user (a fresh device: the tour replays) or on the real gate. */
		armStarters: (asNewUser: boolean) => {
			useAppStore.setState({
				devStarterEligible: asNewUser,
				...(asNewUser && { reflectTourVersion: 0 }),
			});
			if (userId) {
				useAppStore
					.getState()
					.clearAccountFlags(userId, ["starterSuggestionsSeen"]);
			}
			toast(
				asNewUser
					? "Starter suggestions armed · new user"
					: "Starter suggestions · real gate"
			);
			router.dismissTo("/");
		},
		clearAgeGate: () =>
			clearAgeDeclarations()
				.then(() =>
					toast("Date of birth cleared", {
						description: "The next Ask to talk asks for a date of birth again.",
					})
				)
				.catch(failed("Clearing the date of birth failed")),
		openDevStates: () => router.push("/dev"),
		previewPlusStep: () => router.push("/intake-plus-preview"),
		replayBadge: () =>
			seedBadgeUnlock().catch(failed("Badge unlock replay failed")),
		replayDeferred: () =>
			clearDeferredAnswers()
				.then(() => {
					// The once-only marks kept on this device, so each ask can show again here.
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
		// No navigation: `onboardingComplete` is the root guard and swaps the group.
		replayIntake: () =>
			once(() =>
				resetIntake()
					// A replay reads the flag again, so a tester can reach the other arm.
					.then(() => useAppStore.setState({ intakeArms: {} }))
					.catch(failed("Intake reset failed"))
			),
		replayReveal: () => {
			acknowledge(0);
			toast("Reveal re-armed", {
				description: "Go back home to watch it again.",
			});
		},
		resetAwareness: () => {
			useAppStore.setState({ seenEventIds: [] });
			useAppStore.getState().setPendingEventPrompt(null);
			toast("Awareness events reset", {
				description: "Reopen home to see the card.",
			});
		},
		runStreak: (mode: "bump" | "reset") =>
			once(() =>
				setStreak({ mode })
					.then((streak) => {
						// Make the reveal pending: acknowledged = the day before.
						acknowledge(Math.max(streak - 1, 0));
						toast(`Streak set to day ${streak}`, {
							description: "Go back home to watch the reveal.",
						});
					})
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
							description: "Go back to the reflect home to see the check-in.",
						})
					)
					.catch(failed("Seed failed"))
			),
		sentryTest: () => Sentry.captureException(new Error("Sentry test error")),
	};
}
