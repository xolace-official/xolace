import { Button, PressableFeedback, useThemeColor } from "heroui-native";
import {
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { AppText } from "@/components/shared/app-text";
import {
	ANNOUNCEMENT_KINDS,
	type AnnouncementKind,
} from "@/features/kindling/announcement-poses";
import { PoseBubble } from "@/features/kindling/components/pose-bubble";

const COPY = {
	continue: "Continue",
	eyebrow: "Your kindling",
	free: "Xolace+ gathers a kindling after sessions like this one, small support steps, picked for what you brought.",
	paywall: "Get my kindling with Xolace+",
	plus: "Small support steps for after this, something to breathe with, hear, read, or share. It'll be waiting when you're done.",
	title: "We're gathering a few things for you",
};

// [centreX, centreY, radius] as fractions of the cluster width: one large
// circle in the middle, the rest packed close around it at mixed sizes.
const CLUSTER: Record<AnnouncementKind, readonly [number, number, number]> = {
	audio: [0.44, 0.15, 0.13],
	breathing: [0.44, 0.467, 0.146],
	bridge: [0.5, 0.744, 0.09],
	music: [0.72, 0.29, 0.114],
	read: [0.2, 0.464, 0.066],
	xolacer: [0.72, 0.57, 0.103],
};
const CLUSTER_HEIGHT = 0.84;

type Props = {
	variant: "plus" | "free";
	onSkip: () => void;
	onContinue: () => void;
	onPaywall: () => void;
};

export function KindlingAnnouncementScreen({
	variant,
	onSkip,
	onContinue,
	onPaywall,
}: Props) {
	const insets = useSafeAreaInsets();
	const { width: windowWidth, height } = useWindowDimensions();
	// Cap the cluster at half the usable height so the copy + CTA fit on short screens.
	const width = Math.min(
		windowWidth,
		((height - insets.top - insets.bottom - 64) * 0.5) / CLUSTER_HEIGHT
	);
	const accent = useThemeColor("accent") as string;
	const plus = variant === "plus";
	const cta = plus ? COPY.continue : COPY.paywall;

	return (
		<View
			className="flex-1 bg-background"
			style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 48 }}
		>
			<PressableFeedback
				accessibilityLabel="Skip"
				accessibilityRole="button"
				className="absolute right-4 z-10 rounded-full bg-foreground/10 px-4 py-2"
				onPress={onSkip}
				style={{ top: insets.top + 8 }}
			>
				<AppText className="text-foreground text-sm">Skip</AppText>
			</PressableFeedback>

			<ScrollView
				contentContainerClassName="grow"
				showsVerticalScrollIndicator={false}
			>
				<View
					className="self-center"
					style={{ height: width * CLUSTER_HEIGHT, width }}
				>
					<Svg
						height={width * CLUSTER_HEIGHT}
						style={StyleSheet.absoluteFill}
						width={width}
					>
						<Defs>
							<RadialGradient cx="50%" cy="50%" id="kindling-glow" r="50%">
								<Stop offset="0" stopColor={accent} stopOpacity={0.28} />
								<Stop offset="1" stopColor={accent} stopOpacity={0} />
							</RadialGradient>
						</Defs>
						<Circle
							cx={width * 0.47}
							cy={width * 0.45}
							fill="url(#kindling-glow)"
							r={width * 0.48}
						/>
					</Svg>
					{ANNOUNCEMENT_KINDS.map((kind) => {
						const [cx, cy, r] = CLUSTER[kind];
						return (
							<View
								className="absolute"
								key={kind}
								style={{ left: (cx - r) * width, top: (cy - r) * width }}
							>
								<PoseBubble kind={kind} size={2 * r * width} />
							</View>
						);
					})}
				</View>

				<View className="mt-auto items-center gap-3 px-6">
					<AppText className="text-accent text-xs uppercase tracking-widest">
						{COPY.eyebrow}
					</AppText>
					<AppText className="text-center font-serif text-3xl text-foreground leading-9">
						{COPY.title}
					</AppText>
					<AppText className="text-center text-base text-muted">
						{plus ? COPY.plus : COPY.free}
					</AppText>
					<Button
						accessibilityLabel={cta}
						accessibilityRole="button"
						className="mt-3 w-full"
						onPress={plus ? onContinue : onPaywall}
						size="lg"
					>
						<Button.Label>{cta}</Button.Label>
					</Button>
				</View>
			</ScrollView>
		</View>
	);
}
