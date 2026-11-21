import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { imageSource } from "@/lib/image-source";
import { PLAYER_SCRIM } from "../player-palette";

const ABSOLUTE_FILL = { inset: 0, position: "absolute" } as const;
const BLUR = 40;

export function PlayerBackdrop({ coverUrl }: { coverUrl?: string }) {
	return (
		<View className="absolute inset-0 bg-player-scrim" pointerEvents="none">
			{coverUrl ? (
				<Image
					blurRadius={BLUR}
					contentFit="cover"
					source={imageSource(coverUrl)}
					style={ABSOLUTE_FILL}
				/>
			) : null}
			<LinearGradient
				colors={PLAYER_SCRIM.colors}
				locations={PLAYER_SCRIM.locations}
				style={ABSOLUTE_FILL}
			/>
		</View>
	);
}
