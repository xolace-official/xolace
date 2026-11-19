import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { MorphLoader } from "@/components/shared/loader/morph/morph-loader";
import { COPY } from "./copy";

/** Production's empty-state leaf. */
const LEAF = { android: "eco", ios: "leaf", web: "eco" } as const;
const LEAF_SIZE = 40;
/** Loading, offline, or no kindling: a line in the middle of the scroll. */
export function KindlingStatus({
	status,
}: {
	status: "loading" | "offline" | "none" | "ready";
}) {
	const foreground = useThemeColor("foreground");
	let line: string = COPY.none;
	if (status === "loading") {
		line = COPY.loading;
	} else if (status === "offline") {
		line = COPY.offline;
	}
	return (
		<View className="flex-grow items-center justify-center gap-4 px-8 pb-24">
			{status === "loading" ? <MorphLoader /> : null}
			{status === "none" ? (
				<SymbolView name={LEAF} size={LEAF_SIZE} tintColor={foreground} />
			) : null}
			<AppText
				accessibilityLiveRegion="polite"
				className="text-center"
				color="muted"
				variant="callout"
			>
				{line}
			</AppText>
		</View>
	);
}
