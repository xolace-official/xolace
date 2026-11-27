import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { getInitials } from "@/helpers/utils/strings";

/**
 * The rate sheet's own avatar: the accent circle with two initials, unlike
 * connect's `XolacerAvatar` (one initial on the person's art gradient). Kept
 * so the sheet looks exactly as it did before it moved here.
 */
export function RateAvatar({
	name,
	photoUrl,
}: {
	name: string;
	photoUrl?: string;
}) {
	if (photoUrl) {
		return (
			<View className="h-[76px] w-[76px] overflow-hidden rounded-full bg-surface-secondary">
				<Image
					contentFit="cover"
					source={{ uri: photoUrl }}
					style={StyleSheet.absoluteFill}
				/>
			</View>
		);
	}
	return (
		<View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-accent">
			<AppText className="font-semibold text-2xl text-accent-foreground">
				{getInitials(name)}
			</AppText>
		</View>
	);
}
