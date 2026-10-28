import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useObserve } from "expo-observe";
import { router } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { MonthlyEventSheet } from "@/features/awareness-events/components/monthly-event-sheet";
import { useAwarenessEvent } from "@/features/awareness-events/hooks/use-awareness-event";
import { ReflectScreen } from "@/features/reflect/components/reflect-screen";
import { ReturnWelcomeSheet } from "@/features/reflect/components/return-welcome-sheet";
import { useFollowUpCheckIn } from "@/features/reflect/hooks/use-follow-up-check-in";
import { useReturnWelcome } from "@/features/reflect/hooks/use-return-welcome";
import { shouldShowReflectTour } from "@/features/reflect-tour/tour-copy";
import { StarterSuggestionsBubble } from "@/features/starter-suggestions/starter-suggestions-bubble";
import { useStarterSuggestions } from "@/features/starter-suggestions/use-starter-suggestions";
import {
	computeQuietReturn,
	computeUserVariant,
} from "@/helpers/utils/user-variant";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";

const BANNER_INITIAL = { opacity: 0 };

function NotificationBanner({
	content,
	onDismiss,
}: {
	content: string;
	onDismiss: () => void;
}) {
	const insets = useSafeAreaInsets();
	const [visible, setVisible] = useState(true);

	const handleDismiss = () => {
		setVisible(false);
	};

	useEffect(() => {
		const timer = setTimeout(handleDismiss, 8000);
		return () => clearTimeout(timer);
	}, []);

	const animate = { opacity: visible ? 1 : 0 };
	const transition = visible
		? {
				duration: 400,
				easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
				type: "timing" as const,
			}
		: {
				duration: 300,
				easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
				type: "timing" as const,
			};
	const bannerStyle = {
		boxShadow: "0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10)",
		left: 20,
		position: "absolute" as const,
		right: 20,
		top: insets.top + 8,
		zIndex: 10,
	};

	return (
		<EaseView
			animate={animate}
			className={"rounded-2xl"}
			initialAnimate={BANNER_INITIAL}
			onTransitionEnd={({ finished }) => {
				if (finished && !visible) {
					onDismiss();
				}
			}}
			style={bannerStyle}
			transition={transition}
		>
			<Pressable
				className="rounded-2xl border border-border/40 bg-surface px-4 py-3"
				onPress={handleDismiss}
			>
				<AppText className="mb-0.5 text-[11px] text-foreground/40 uppercase tracking-wide">
					You were reached
				</AppText>
				<AppText className="text-foreground/85 text-sm leading-5">
					{content}
				</AppText>
				<AppText className="mt-1.5 text-[10px] text-foreground/30">
					tap to dismiss
				</AppText>
			</Pressable>
		</EaseView>
	);
}

export default function ProtectedIndex() {
	const lastNotification = useAppStore((s) => s.lastNotification);
	const clearLastNotification = useAppStore((s) => s.clearLastNotification);
	const reflectTourVersion = useAppStore((s) => s.reflectTourVersion);
	const setHomeSheetBlocking = useAppStore((s) => s.setHomeSheetBlocking);
	const setHomeSheetOpen = useAppStore((s) => s.setHomeSheetOpen);
	const reflectSettled = useAppStore((s) => s.reflectSettled);
	const isFocused = useIsFocused();
	const awarenessEvent = useAwarenessEvent();
	const { markInteractive } = useObserve();

	// Snapshot, not live read: the awareness sheet waits for a launch where the
	// tour is already behind the user. Persisted state hydrates synchronously,
	// so this is the real value on the first render.
	const [tourSeenAtMount] = useState(
		!shouldShowReflectTour(reflectTourVersion)
	);

	// Same getFullContext query ReflectScreen subscribes to; Convex dedupes it.
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

	// Per-route TTI: ready once the user context query resolves, not at mount.
	// Only the first markInteractive call per navigation is recorded.
	useEffect(() => {
		if (profile) {
			markInteractive();
		}
	}, [profile, markInteractive]);

	// Home sheet chain: ReturnWelcome, then MonthlyEvent. Arms only once focused.
	const returnWelcome = useReturnWelcome({
		active: isFocused && !!profile && !followUp.blocking,
		lastSessionAt: profile?.lastSessionAt,
		quietReturn: profile ? computeQuietReturn(profile) : null,
		variant: profile
			? computeUserVariant(profile, fullContext.streak)
			: { kind: "first-time" },
	});

	// ReturnWelcome, FollowUp, then MonthlyEvent; also waits for the tour, which
	// owns the idle screen on a first run (see tourSeenAtMount).
	const awarenessOpen =
		tourSeenAtMount &&
		isFocused &&
		!returnWelcome.blocking &&
		!followUp.blocking;

	const awarenessShowing = awarenessOpen && awarenessEvent !== null;

	// After MonthlyEvent. Waits for the tour (see useStarterSuggestions) and
	// for the reflect card underneath to have arrived.
	const starter = useStarterSuggestions({
		active:
			isFocused &&
			reflectSettled &&
			!returnWelcome.blocking &&
			!followUp.blocking &&
			!awarenessShowing,
		sessionCount: profile?.sessionCount,
	});

	// The tour subscribes to this so its coach marks never render under a sheet.
	const sheetBlocking =
		returnWelcome.blocking ||
		followUp.blocking ||
		awarenessShowing ||
		starter.isOpen;

	useEffect(() => {
		setHomeSheetBlocking(sheetBlocking);
	}, [sheetBlocking, setHomeSheetBlocking]);

	// The streak reveal waits on sheets actually on screen, not a pending follow-up.
	const sheetOpen = returnWelcome.isOpen || awarenessShowing || starter.isOpen;
	useEffect(() => {
		setHomeSheetOpen(sheetOpen);
		return () => setHomeSheetOpen(false);
	}, [sheetOpen, setHomeSheetOpen]);

	// Waits its turn behind the home sheets; the screen acknowledges on close.
	useEffect(() => {
		if (frozenDays > 0 && isFocused && !sheetBlocking && !freezeShown.current) {
			freezeShown.current = true;
			router.push({ params: { days: frozenDays }, pathname: "/streak-held" });
		}
	}, [frozenDays, isFocused, sheetBlocking]);

	return (
		<>
			<StatusBar hidden />
			<View className="flex-1">
				<ReflectScreen />
				{lastNotification && (
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
				{starter.isOpen && (
					<StarterSuggestionsBubble
						intake={fullContext?.intake}
						onResolve={starter.resolve}
					/>
				)}
			</View>
		</>
	);
}
