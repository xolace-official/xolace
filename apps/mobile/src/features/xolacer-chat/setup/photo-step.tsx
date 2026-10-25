import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, Spinner, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";

const CAMERA_ICON = {
	android: "photo_camera",
	ios: "camera.fill",
	web: "photo_camera",
} as const;
const IMAGE_STYLE = { height: "100%", width: "100%" } as const;

export function PhotoStep({
	photoUrl,
	uploading,
	onPick,
}: {
	photoUrl?: string;
	uploading: boolean;
	onPick: () => void;
}) {
	const muted = useThemeColor("muted") as string;

	return (
		<View className="items-center gap-3 pt-4">
			<PressableFeedback
				accessibilityLabel={photoUrl ? "Change your photo" : "Add a photo"}
				accessibilityRole="button"
				isDisabled={uploading}
				onPress={() => {
					playSoftPress();
					onPick();
				}}
			>
				<View className="h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-border border-dashed bg-surface-secondary">
					{uploading ? (
						<Spinner />
					) : photoUrl ? (
						<Image
							contentFit="cover"
							source={{ uri: photoUrl }}
							style={IMAGE_STYLE}
						/>
					) : (
						<SymbolView name={CAMERA_ICON} size={26} tintColor={muted} />
					)}
				</View>
			</PressableFeedback>
			<AppText className="font-semibold text-[13px] text-accent">
				{photoUrl ? "Choose a different photo" : "Choose a photo"}
			</AppText>
			<AppText className="max-w-65 text-center text-[11px] text-muted leading-4">
				This is the only image anyone sees. It stays on your Xolacer profile and
				nowhere else.
			</AppText>
		</View>
	);
}
