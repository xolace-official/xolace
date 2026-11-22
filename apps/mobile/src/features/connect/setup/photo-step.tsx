import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { SETUP } from "./copy";

const PHOTO = 128;
const CAMERA = { android: "photo_camera", ios: "camera" } as const;

export function PhotoStep({
	photoUrl,
	uploading,
	onPick,
	note,
}: {
	photoUrl?: string;
	uploading: boolean;
	onPick: () => void;
	note?: string;
}) {
	const muted = useTokenColor("muted");
	const foreground = useTokenColor("foreground");
	const pick = () => {
		if (!uploading) {
			onPick();
		}
	};
	return (
		<View className="items-center pt-4">
			<PressScale
				accessibilityLabel={photoUrl ? SETUP.photo.change : SETUP.photo.add}
				accessibilityState={{ busy: uploading }}
				className={cn(
					"items-center justify-center overflow-hidden rounded-full bg-surface-secondary",
					photoUrl ? null : "border-2 border-foreground/20 border-dashed"
				)}
				haptic={playSoftPress}
				onPress={pick}
				style={{ height: PHOTO, width: PHOTO }}
			>
				{photoUrl ? (
					<Image
						contentFit="cover"
						source={{ uri: photoUrl }}
						style={{ height: PHOTO, width: PHOTO }}
					/>
				) : (
					<Icon color={muted} name={CAMERA} size={30} />
				)}
				{uploading ? (
					<View className="absolute inset-0 items-center justify-center bg-background/55">
						<ActivityIndicator color={foreground} />
					</View>
				) : null}
			</PressScale>
			<Pressable
				accessibilityRole="button"
				className="mt-4"
				hitSlop={10}
				onPress={() => {
					playSoftPress();
					pick();
				}}
			>
				<AppText color="accentInk" variant="callout" weight="semibold">
					{photoUrl ? SETUP.photo.chooseOther : SETUP.photo.choose}
				</AppText>
			</Pressable>
			<AppText
				center
				className="mt-8 max-w-72"
				color="muted"
				variant="footnote"
			>
				{SETUP.photo.fine}
			</AppText>
			{note ? (
				<AppText
					center
					className="mt-1 max-w-72"
					color="muted"
					variant="footnote"
				>
					{note}
				</AppText>
			) : null}
		</View>
	);
}
