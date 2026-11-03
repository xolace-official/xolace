// PROTOTYPE (#684), throwaway: never merge.
import { Image } from "expo-image";
import { useThemeColor } from "heroui-native";
import type { Achievement } from "./catalog.prototype";

type Props = {
	item: Achievement;
	size: number;
	/** "tint" = expo-image tintColor silhouette (the art-direction default);
	 * "dim" = the real art, faded and greyed by opacity. */
	locked?: "tint" | "dim";
};

/** One medallion. Locked badges keep their shape so the shelf reads as slots. */
export function Badge({ item, size, locked = "tint" }: Props) {
	const muted = useThemeColor("muted") as string;
	const isLocked = !item.earnedAt;
	return (
		<Image
			accessibilityLabel={`${item.title}${isLocked ? ", locked" : ""}`}
			contentFit="contain"
			source={item.art}
			style={{
				height: size,
				opacity: isLocked ? (locked === "tint" ? 0.28 : 0.4) : 1,
				width: size,
			}}
			tintColor={isLocked && locked === "tint" ? muted : undefined}
		/>
	);
}
