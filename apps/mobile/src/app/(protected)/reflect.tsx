// Reflect (S2), pushed over the tabs from Today's card and toolbar. The screen runs on
// production's session; the route adds what it shares with other features: the starter
// bubble (which opens Write through the store's `requestComposerOpen`) and shake-to-feedback.
import { useAuth } from "@clerk/expo";
import { useObserve } from "expo-observe";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import { View } from "react-native";
import { useFeedbackShake } from "@/features/feedback-tray/feedback-tray-provider";
import { echoOf } from "@/features/intake/v2/heard";
import { ReflectData, useReflect } from "@/features/reflect/reflect-data";
import { ReflectScreen } from "@/features/reflect/reflect-screen";
import { StarterSuggestionsBubble } from "@/features/starter-suggestions/starter-suggestions-bubble";
import { useStarterSuggestions } from "@/features/starter-suggestions/use-starter-suggestions";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useAppStore } from "@/store/store";

export default function ReflectRoute() {
	return (
		<ReflectData>
			<View className="flex-1">
				<ReflectScreen />
				<ReflectShake />
				<ReflectStarter />
			</View>
		</ReflectData>
	);
}

/** Shake-to-feedback stays out of the way while someone writes or waits on the mirror. */
function ReflectShake() {
	const { stage, error } = useReflect().state;
	// On the error card nothing is being written or waited on, so shake works again, as before.
	const busy = stage === "write" || (stage === "wait" && error === null);
	useFeedbackShake({ enabled: !busy });
	return null;
}

/** The starter bubble: once per account, at zero sessions, over Write. */
function ReflectStarter() {
	const isFocused = useIsFocused();
	const reflectSettled = useAppStore((s) => s.reflectSettled);
	// Set by the coming-back chain on Today: a follow-up, return welcome or monthly event.
	const homeSheetBlocking = useAppStore((s) => s.homeSheetBlocking);
	const setHomeSheetOpen = useAppStore((s) => s.setHomeSheetOpen);
	const fullContext = useFullContext();

	// Interactive once the profile is in: the bubble and the stages can read it.
	const { markInteractive } = useObserve();
	const profileLoaded = Boolean(fullContext?.profile);
	useEffect(() => {
		if (profileLoaded) {
			markInteractive();
		}
	}, [profileLoaded, markInteractive]);

	const starter = useStarterSuggestions({
		active: isFocused && reflectSettled && !homeSheetBlocking,
		sessionCount: fullContext?.profile?.sessionCount,
	});

	// Intake v2's first answer (#707), offered back once on the bubble. Only to the account
	// that gave it; spent with the bubble, whichever way it resolves.
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

	// The streak reveal and arrivals wait on a sheet on screen; raise the flag while it's up.
	useEffect(() => {
		if (!starter.isOpen) {
			return;
		}
		setHomeSheetOpen(true);
		return () => setHomeSheetOpen(false);
	}, [starter.isOpen, setHomeSheetOpen]);

	if (!starter.isOpen) {
		return null;
	}
	return (
		<StarterSuggestionsBubble
			intake={fullContext?.intake}
			onResolve={() => {
				setIntakeFirstAnswer(null);
				starter.resolve();
			}}
			pickUp={pickUp}
		/>
	);
}
