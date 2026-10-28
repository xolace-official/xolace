import { Pressable, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { ScopedTheme } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import type { ThemeEntry } from "@/lib/themes";
import { cn } from "@/lib/utils";

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
 * The card renders inside a ScopedTheme of the theme's dark variant, so it
 * shows that theme's own tokens whatever the active global theme is.
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
	const isLocked =
		lockedOverride ?? (theme.tier === "premium" && theme.available === false);

	return (
		<Pressable
			accessibilityLabel={`${theme.name} theme${isActive ? ", active" : ""}`}
			accessibilityRole="button"
			onPress={onPress}
			style={{ width }}
		>
			<ScopedTheme theme={theme.variants.dark}>
				{/* Outer ring — only visible when active */}
				<View
					className={cn(
						"rounded-[16px]",
						isActive && "border-[1.5px] border-accent p-0.5"
					)}
				>
					{/* Card body */}
					<View
						className={cn(
							"min-h-[140px] overflow-hidden bg-background p-3.5",
							isActive ? "rounded-[14px]" : "rounded-[16px]"
						)}
					>
						{/* Encouragement line */}
						<AppText className="mb-2 text-[9px] text-foreground/30 italic">
							{"What's here right now..."}
						</AppText>

						{/* Faux separator */}
						<View className="mb-2 h-[0.5px] bg-border" />

						{/* Headline */}
						<AppText className="mb-3 font-semibold text-[12px] text-foreground leading-[17px]">
							{"What's here\nright now?"}
						</AppText>

						{/* Texture chip */}
						<View className="self-start rounded-full border border-accent/40 bg-accent/10 px-2 py-[3px]">
							<AppText className="font-medium text-[9px] text-accent">
								heavy
							</AppText>
						</View>

						{/* Accent dot bottom-right */}
						<View className="absolute right-2.5 bottom-2.5 size-[5px] rounded-full bg-accent/50" />

						{/* Lock overlay for premium */}
						{isLocked && (
							<View className="absolute inset-0 items-center justify-center rounded-[16px] bg-background/80">
								<AppText style={styles.lockIcon}>🔒</AppText>
							</View>
						)}
					</View>
				</View>
			</ScopedTheme>

			{/* Label row */}
			<View style={styles.labelRow}>
				<AppText className="text-foreground/70 text-xs">{theme.name}</AppText>
				{isActive && (
					<EaseView
						animate={EASE_ANIMATE}
						initialAnimate={EASE_INITIAL}
						transition={EASE_TRANSITION}
					>
						<ScopedTheme theme={theme.variants.dark}>
							<AppText className="text-[9px] text-accent">· Active</AppText>
						</ScopedTheme>
					</EaseView>
				)}
			</View>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	labelRow: {
		alignItems: "center",
		flexDirection: "row",
		gap: 4,
		marginTop: 6,
	},
	lockIcon: { fontSize: 18 },
});
