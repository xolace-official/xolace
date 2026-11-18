import { View } from "react-native";
import { LANDING } from "@/lib/landing";
import { ReturnTo } from "@/lib/return-to";

/**
 * "/" is where sign-in, intake and old links land; the app's landing is Today's tab. On a
 * cold start this replaces itself with the tabs (no second copy, no animation: `(tabs)` has
 * `animation: "none"`). Reflect, which lived here, is `/reflect`, pushed over the tabs.
 */
export default function ProtectedIndex() {
	return (
		<View className="flex-1 bg-background">
			<ReturnTo href={LANDING} />
		</View>
	);
}
