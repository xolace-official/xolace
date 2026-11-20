import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetButton } from "@/components/settings-kit/sheet-button";
import { AppText } from "@/components/shared/app-text";
import { UPDATE_COPY } from "./copy";
import type { UpdateMode } from "./update-model";

const SHEET_BOTTOM = 18;

export function UpdateSheet({
	mode,
	onPrimary,
	onLater,
}: {
	mode: UpdateMode;
	onPrimary: () => void;
	onLater: () => void;
}) {
	const insets = useSafeAreaInsets();
	const c = UPDATE_COPY[mode];
	return (
		<View
			className="px-6 pt-8"
			style={{ paddingBottom: Math.max(insets.bottom, SHEET_BOTTOM) }}
		>
			<AppText accessibilityRole="header" variant="title">
				{c.title}
			</AppText>
			<AppText className="mt-2" color="muted" variant="body">
				{c.description}
			</AppText>
			<View className="mt-7 gap-2">
				<SheetButton label={c.primaryLabel} onPress={onPrimary} primary />
				{c.later ? <SheetButton label={c.later} onPress={onLater} /> : null}
			</View>
		</View>
	);
}
