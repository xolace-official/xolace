// Reflect (S2), pushed over the tabs from Today's card and toolbar. The screen runs on
// production's session; the route adds what it shares with other features: shake-to-feedback.
import { useObserve } from "expo-observe";
import { useEffect } from "react";
import { View } from "react-native";
import { useFeedbackShake } from "@/features/feedback/shake/use-feedback-shake";
import { ReflectData, useReflect } from "@/features/reflect/reflect-data";
import { ReflectScreen } from "@/features/reflect/reflect-screen";
import { useFullContext } from "@/lib/convex/use-full-context";

export default function ReflectRoute() {
	return (
		<ReflectData>
			<View className="flex-1">
				<ReflectScreen />
				<ReflectShake />
				<ReflectReady />
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

/** Interactive once the profile is in: the stages can read it. */
function ReflectReady() {
	const fullContext = useFullContext();
	const { markInteractive } = useObserve();
	const profileLoaded = Boolean(fullContext?.profile);
	useEffect(() => {
		if (profileLoaded) {
			markInteractive();
		}
	}, [profileLoaded, markInteractive]);
	return null;
}
