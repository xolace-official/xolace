import { useAuth } from "@clerk/expo";
import { useObserve } from "expo-observe";
import { useIsFocused } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { echoOf } from "@/features/intake/v2/heard";
import { ReflectScreen } from "@/features/reflect/components/reflect-screen";
import { StarterSuggestionsBubble } from "@/features/starter-suggestions/starter-suggestions-bubble";
import { useStarterSuggestions } from "@/features/starter-suggestions/use-starter-suggestions";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";

/**
 * Reflect at `/reflect`, pushed over the tabs: the old screen plus the starter bubble that
 * points at its composer. Moved unchanged from the old home at "/" when Today became the
 * landing; the coming-back chain stayed on Today (`features/follow-up/coming-back/`).
 */
export function ReflectHome() {
	const isFocused = useIsFocused();
	const reflectSettled = useAppStore((s) => s.reflectSettled);
	// Set by the coming-back chain on Today: a follow-up, return welcome or monthly event.
	const homeSheetBlocking = useAppStore((s) => s.homeSheetBlocking);
	const setHomeSheetOpen = useAppStore((s) => s.setHomeSheetOpen);

	// Same getFullContext query ReflectScreen subscribes to; Convex dedupes it.
	const fullContext = useFullContext();
	const { markInteractive } = useObserve();
	// Per-route TTI, as when Reflect was "/": ready once the user context resolves.
	useEffect(() => {
		if (fullContext?.profile) {
			markInteractive();
		}
	}, [fullContext?.profile, markInteractive]);

	// Last of the home sheets. Waits for the tour (see useStarterSuggestions) and
	// for the reflect card underneath to have arrived.
	const starter = useStarterSuggestions({
		active: isFocused && reflectSettled && !homeSheetBlocking,
		sessionCount: fullContext?.profile?.sessionCount,
	});

	// Intake v2's first answer (#707), offered back once on the starter bubble. Only to the
	// account that gave it; spent with the bubble, whichever way it resolves.
	const { userId } = useAuth();
	const firstAnswer = useAppStore((s) => s.intakeFirstAnswer);
	const setIntakeFirstAnswer = useAppStore((s) => s.setIntakeFirstAnswer);
	const pickUp =
		firstAnswer && firstAnswer.userId === userId && fullContext
			? {
					name: fullContext.preferences?.displayName ?? "",
					quote: echoOf(firstAnswer.text),
					text: firstAnswer.text,
				}
			: null;

	// The streak reveal and arrivals wait on a sheet on screen. Today's sheets are closed
	// while Reflect is up, so this only ever raises the flag for the bubble's lifetime.
	useEffect(() => {
		if (!starter.isOpen) {
			return;
		}
		setHomeSheetOpen(true);
		return () => setHomeSheetOpen(false);
	}, [starter.isOpen, setHomeSheetOpen]);

	return (
		<>
			<StatusBar hidden />
			<View className="flex-1">
				<ReflectScreen />
				{starter.isOpen && (
					<StarterSuggestionsBubble
						intake={fullContext?.intake}
						onResolve={() => {
							setIntakeFirstAnswer(null);
							starter.resolve();
						}}
						pickUp={pickUp}
					/>
				)}
			</View>
		</>
	);
}
