import BedtimeIcon from "@expo/material-symbols/bedtime.xml";
import PersonIcon from "@expo/material-symbols/person.xml";
import { Stack } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { DeleteConfirm } from "../list/row-actions";

const IOS = process.env.EXPO_OS === "ios";
const ARROW = { android: "arrow_forward", ios: "arrow.right" } as const;

/** A published Xolacer's way to their own profile, in the header; a moon while they're paused. */
export function MyProfileButton({
	paused,
	onPress,
}: {
	paused: boolean;
	onPress: () => void;
}) {
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Button
				accessibilityLabel={
					paused ? COPY.myProfile.paused : COPY.myProfile.label
				}
				icon={
					paused
						? IOS
							? "moon.zzz"
							: BedtimeIcon
						: IOS
							? "person.crop.circle"
							: PersonIcon
				}
				onPress={() => {
					playSoftPress();
					onPress();
				}}
			/>
		</Stack.Toolbar>
	);
}

/** For a Xolacer whose profile isn't published yet: the only way into setup. */
export function SetupBanner({ onPress }: { onPress: () => void }) {
	const accent = useTokenColor("accent-ink");
	return (
		<PressScale
			accessibilityLabel={COPY.setup.title}
			card
			className="flex-row items-center gap-3 rounded-card border border-accent/25 bg-accent-wash p-4"
			haptic={playSoftPress}
			onPress={onPress}
		>
			<View className="flex-1 gap-0.5">
				<AppText variant="callout" weight="semibold">
					{COPY.setup.title}
				</AppText>
				<AppText color="muted" variant="footnote">
					{COPY.setup.body}
				</AppText>
			</View>
			<Icon color={accent} name={ARROW} size={16} />
		</PressScale>
	);
}

/** Delete request asks first: it can't be undone. */
export function DeleteDialog({ deleting }: { deleting: DeleteConfirm }) {
	return (
		<ConfirmationDialog
			confirmLabel={COPY.deleteDialog.confirm}
			description={COPY.deleteDialog.body}
			isDestructive
			isOpen={deleting.open}
			onConfirm={deleting.confirm}
			onOpenChange={(open) => {
				if (!open) {
					deleting.cancel();
				}
			}}
			title={COPY.deleteDialog.title}
		/>
	);
}
