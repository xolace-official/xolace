import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { YouData } from "@/features/you/home/you-data";
import { YouScreen } from "@/features/you/home/you-screen";
import { YouUiProvider } from "@/features/you/home/you-ui";

/** The You tab. NativeTabs mounts every tab eagerly (see connect/index.tsx); held until
 * focused so launch doesn't also run its queries. */
export default function YouRoute() {
	const isFocused = useIsFocused();
	const [everFocused, setEverFocused] = useState(isFocused);
	if (isFocused && !everFocused) {
		setEverFocused(true);
	}

	if (!everFocused) {
		return <View className="flex-1 bg-background" />;
	}
	return (
		<YouData>
			<YouUiProvider>
				<YouScreen />
			</YouUiProvider>
		</YouData>
	);
}
