import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import type { ThemeEntry } from "@/src/lib/themes";

type Props = {
	theme: ThemeEntry;
	isActive: boolean;
	onPress: () => void;
	/** Overrides the default lock (premium + no CSS yet), e.g. premium && !isPlus. */
	isLocked?: boolean;
	width?: number;
};

const EASE_EASING: [number, number, number, number] = [
	0.455, 0.03, 0.515, 0.955,
];
const EASE_INITIAL = { opacity: 0 };
const EASE_ANIMATE = { opacity: 1 };
const EASE_TRANSITION = {
	duration: 200,
	easing: EASE_EASING,
	type: "timing" as const,
};

/**
 * Mini preview card showing a snapshot of the reflect idle screen.
 * Uses theme.preview hex colors as inline styles — no CSS variable
 * resolution needed, works regardless of the active global theme.
 *
 * Active: accent ring + "Active" micro-label.
 * Premium/unavailable: lock glyph overlay; tap is handled by parent.
 */
export const ThemePreviewCard = ({
	theme,
	isActive,
	onPress,
	isLocked: lockedOverride,
	width = 130,
}: Props) => {
	const { preview } = theme;
	const isLocked =
		lockedOverride ?? (theme.tier === "premium" && theme.available === false);

	const outerRingStyle = {
		borderColor: isActive ? preview.accent : "transparent",
		borderRadius: 16,
		borderWidth: isActive ? 1.5 : 0,
		padding: isActive ? 2 : 0,
	};
	const cardBodyStyle = {
		backgroundColor: preview.bg,
		borderRadius: isActive ? 14 : 16,
		minHeight: 140,
		overflow: "hidden" as const,
		padding: 14,
	};
	const encouragementStyle = {
		color: preview.fg + "50",
		fontSize: 9,
		fontStyle: "italic" as const,
		marginBottom: 8,
	};
	const separatorStyle = {
		backgroundColor: preview.border,
		height: 0.5,
		marginBottom: 8,
	};
	const headlineStyle = {
		color: preview.fg,
		fontSize: 12,
		fontWeight: "600" as const,
		lineHeight: 17,
		marginBottom: 12,
	};
	const chipStyle = {
		alignSelf: "flex-start" as const,
		backgroundColor: preview.accent + "18",
		borderColor: preview.accent + "60",
		borderRadius: 20,
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 3,
	};
	const chipLabelStyle = {
		color: preview.accent,
		fontSize: 9,
		fontWeight: "500" as const,
	};
	const accentDotStyle = {
		backgroundColor: preview.accent + "80",
		borderRadius: 2.5,
		bottom: 10,
		height: 5,
		position: "absolute" as const,
		right: 10,
		width: 5,
	};
	const lockOverlayStyle = {
		alignItems: "center" as const,
		backgroundColor: preview.bg + "cc",
		borderRadius: 16,
		bottom: 0,
		justifyContent: "center" as const,
		left: 0,
		position: "absolute" as const,
		right: 0,
		top: 0,
	};
	const activeLabelStyle = { color: preview.accent, fontSize: 9 };

	return (
		<Pressable
			accessibilityLabel={`${theme.name} theme${isActive ? ", active" : ""}`}
			accessibilityRole="button"
			onPress={onPress}
			style={[styles.card, { width }]}
		>
			{/* Outer ring — only visible when active */}
			<View style={outerRingStyle}>
				{/* Card body */}
				<View style={cardBodyStyle}>
					{/* Encouragement line */}
					<AppText style={encouragementStyle}>
						{"What's here right now..."}
					</AppText>

					{/* Faux separator */}
					<View style={separatorStyle} />

					{/* Headline */}
					<AppText style={headlineStyle}>{"What's here\nright now?"}</AppText>

					{/* Texture chip */}
					<View style={chipStyle}>
						<AppText style={chipLabelStyle}>heavy</AppText>
					</View>

					{/* Accent dot bottom-right */}
					<View style={accentDotStyle} />

					{/* Lock overlay for premium */}
					{isLocked && (
						<View style={lockOverlayStyle}>
							<AppText style={styles.lockIcon}>🔒</AppText>
						</View>
					)}
				</View>
			</View>

			{/* Label row */}
			<View style={styles.labelRow}>
				<AppText className="text-foreground/70 text-xs">{theme.name}</AppText>
				{isActive && (
					<EaseView
						animate={EASE_ANIMATE}
						initialAnimate={EASE_INITIAL}
						transition={EASE_TRANSITION}
					>
						<AppText style={activeLabelStyle}>· Active</AppText>
					</EaseView>
				)}
			</View>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	card: {},
	labelRow: {
		alignItems: "center",
		flexDirection: "row",
		gap: 4,
		marginTop: 6,
	},
	lockIcon: { fontSize: 18 },
});
