import { Image } from "expo-image";
import { View } from "react-native";
import { CAMPFIRE_LOOP, CAMPFIRE_STILL } from "../poses";
import type { FireBox } from "./trail-points";

/**
 * Flux at the campfire where the road ends (§5): production's campfire loop, a 4 s transparent
 * WebP that starts and ends on the still's pose; the still with Reduce Motion. Its glow is the
 * road's canvas.
 */
export function KindlingFire({
	fire,
	reduced,
}: {
	fire: FireBox;
	reduced: boolean;
}) {
	return (
		<View
			accessible={false}
			className="absolute"
			pointerEvents="none"
			style={{ height: fire.h, left: fire.x, top: fire.y, width: fire.w }}
		>
			<Image
				accessible={false}
				autoplay={!reduced}
				contentFit="contain"
				placeholder={CAMPFIRE_STILL}
				placeholderContentFit="contain"
				source={reduced ? CAMPFIRE_STILL : CAMPFIRE_LOOP}
				style={{ height: fire.h, width: fire.w }}
			/>
		</View>
	);
}
