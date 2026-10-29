import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
	type AnnouncementKind,
	CLEAN_POSES,
	POSE,
	RING_ACCENT,
	RING_ARC,
} from "@/features/kindling/announcement-poses";
import { TWIG_PRESENTATION } from "@/features/kindling/twig-presentation";

/** One Flux pose in a tinted circle with a decorative partial ring.
 * Purely illustrative: an image to screen readers, never a tap target. */
export function PoseBubble({
	kind,
	size,
}: {
	kind: AnnouncementKind;
	size: number;
}) {
	const stroke = Math.max(3, size * 0.05);
	const inset = stroke * 1.8;
	const r = (size - stroke) / 2;
	const circumference = 2 * Math.PI * r;
	const accent = RING_ACCENT[kind];

	return (
		<View
			accessibilityLabel={TWIG_PRESENTATION[kind].title}
			accessibilityRole="image"
			accessible
			style={{ height: size, width: size }}
		>
			<View
				className="absolute overflow-hidden rounded-full"
				style={{
					backgroundColor: `${accent}33`,
					bottom: inset,
					left: inset,
					right: inset,
					top: inset,
				}}
			>
				<Image
					contentFit={CLEAN_POSES.has(kind) ? "contain" : "cover"}
					source={POSE[kind]}
					style={StyleSheet.absoluteFill}
					transition={200}
				/>
			</View>
			<Svg height={size} style={styles.ring} width={size}>
				<Circle
					cx={size / 2}
					cy={size / 2}
					fill="none"
					r={r}
					stroke={accent}
					strokeOpacity={0.2}
					strokeWidth={stroke}
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					fill="none"
					r={r}
					stroke={accent}
					strokeDasharray={`${circumference * RING_ARC[kind]} ${circumference}`}
					strokeLinecap="round"
					strokeWidth={stroke}
				/>
			</Svg>
		</View>
	);
}

const styles = StyleSheet.create({
	// The ring starts at 12 o'clock.
	ring: { position: "absolute", transform: [{ rotate: "-90deg" }] },
});
