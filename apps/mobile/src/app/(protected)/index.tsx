import { View } from "react-native";
import { LANDING } from "@/lib/landing";
import { ReturnTo } from "@/lib/return-to";

export default function ProtectedIndex() {
	return (
		<View className="flex-1 bg-background">
			<ReturnTo href={LANDING} />
		</View>
	);
}
