import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { MonthlyEventSheet } from "@/features/awareness-events/components/monthly-event-sheet";
import { useAwarenessEvent } from "@/features/awareness-events/hooks/use-awareness-event";
import { NotificationBanner } from "@/features/follow-up/coming-back/notification-banner";
import { ReturnWelcomeSheet } from "@/features/follow-up/coming-back/return-welcome-sheet";
import { useFollowUpCheckIn } from "@/features/follow-up/coming-back/use-follow-up-check-in";
import { useReturnWelcome } from "@/features/follow-up/coming-back/use-return-welcome";
import {
	computeQuietReturn,
	computeUserVariant,
} from "@/helpers/utils/user-variant";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";

/**
 * What greets someone coming back, on the landing (Today's route): the follow-up check-in,
 * then the return welcome, then the month's awareness event, then the streak-held screen for
 * freeze-bridged days, plus the "You were reached" banner. Moved here unchanged from the old
 * Reflect home when Today became the landing; S4's welcome back replaces the whole chain.
 */
export function ComingBack() {
	const lastNotification = useAppStore((s) => s.lastNotification);
	const clearLastNotification = useAppStore((s) => s.clearLastNotification);
	const setHomeSheetBlocking = useAppStore((s) => s.setHomeSheetBlocking);
	const setHomeSheetOpen = useAppStore((s) => s.setHomeSheetOpen);
	const isFocused = useIsFocused();
	const awarenessEvent = useAwarenessEvent();

	const fullContext = useFullContext();
	const profile = fullContext?.profile;
	const hasPendingFollowUp = fullContext?.hasPendingFollowUp ?? false;

	// A pending or ready follow-up suppresses the return-welcome for this reopen.
	const followUp = useFollowUpCheckIn({
		active: isFocused && !!profile,
		hasPendingFollowUp,
	});

	// Best-effort recompute that makes a freeze-bridged gap durable; it also
	// returns unacknowledged freeze-bridged days (#436) for the streak-held screen.
	const settleStreak = useMutation(api.streaks.state.settle);
	const [frozenDays, setFrozenDays] = useState(0);
	const freezeShown = useRef(false);
	const profileId = profile?._id;
	// On every focus and foreground: a mounted app can cross days. Re-runs when
	// streak-held closes, after its acknowledgeFreezes, and only a fresh count
	// re-arms the screen. Results landing after blur are dropped.
	useEffect(() => {
		if (!(profileId && isFocused)) {
			return;
		}
		let live = true;
		const settle = () =>
			settleStreak({
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			}).then(
				(days) => {
					if (!live) {
						return;
					}
					freezeShown.current = false;
					setFrozenDays(days);
				},
				() => {}
			);
		settle();
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				settle();
			}
		});
		return () => {
			live = false;
			sub.remove();
		};
	}, [profileId, isFocused, settleStreak]);

	const returnWelcome = useReturnWelcome({
		active: isFocused && !!profile && !followUp.blocking,
		lastSessionAt: profile?.lastSessionAt,
		quietReturn: profile ? computeQuietReturn(profile) : null,
		variant: profile
			? computeUserVariant(profile, fullContext.streak)
			: { kind: "first-time" },
	});

	// ReturnWelcome, FollowUp, then MonthlyEvent. Reflect's tour runs on Reflect, pushed over
	// Today, so Today is never focused under it: no tour wait here.
	const awarenessOpen =
		isFocused && !returnWelcome.blocking && !followUp.blocking;
	const awarenessShowing = awarenessOpen && awarenessEvent !== null;

	// Reflect's tour and starter bubble wait on this, so they never open under a sheet.
	const sheetBlocking =
		returnWelcome.blocking || followUp.blocking || awarenessShowing;
	useEffect(() => {
		setHomeSheetBlocking(sheetBlocking);
	}, [sheetBlocking, setHomeSheetBlocking]);

	// Arrivals wait on a sheet actually on screen, not a pending follow-up.
	const sheetOpen = returnWelcome.isOpen || awarenessShowing;
	useEffect(() => {
		setHomeSheetOpen(sheetOpen);
		return () => setHomeSheetOpen(false);
	}, [sheetOpen, setHomeSheetOpen]);

	// Waits its turn behind the sheets; the screen acknowledges on close. A reflection in
	// progress is a screen above Today, so it is never focused then.
	useEffect(() => {
		if (frozenDays > 0 && isFocused && !sheetBlocking && !freezeShown.current) {
			freezeShown.current = true;
			router.push({ params: { days: frozenDays }, pathname: "/streak-held" });
		}
	}, [frozenDays, isFocused, sheetBlocking]);

	return (
		<>
			{/* Only while Today is up: the banner's timer starts when it can be seen. */}
			{lastNotification && isFocused && (
				<NotificationBanner
					content={lastNotification.content}
					onDismiss={clearLastNotification}
				/>
			)}
			<ReturnWelcomeSheet
				isOpen={returnWelcome.isOpen}
				onClose={returnWelcome.dismiss}
				tier={returnWelcome.tier}
			/>
			<MonthlyEventSheet event={awarenessOpen ? awarenessEvent : null} />
		</>
	);
}
