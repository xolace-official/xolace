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

function ReflectShake() {
	const { stage, error } = useReflect().state;
	const busy = stage === "write" || (stage === "wait" && error === null);
	useFeedbackShake({ enabled: !busy });
	return null;
}

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
