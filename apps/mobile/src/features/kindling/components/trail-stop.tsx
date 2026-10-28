import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, Surface, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";
import { CLEAN_POSES, POSE } from "../announcement-poses";
import { TWIG_PRESENTATION, type Twig } from "../twig-presentation";

export const STOP_NODE = 84;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** One stop on the trail: Flux's pose and a signpost label. Tended gets a halo
 * and check badge; skipped dims over an opaque backing so the dashes don't show through. */
export function TrailStop({
	twig,
	index,
	right,
	top,
	width,
	inset,
	selected,
	onPress,
}: {
	twig: Twig;
	index: number;
	right: boolean;
	top: number;
	width: number;
	inset: number;
	selected: boolean;
	onPress: () => void;
}) {
	const background = useThemeColor("background") as string;
	const ember = useCSSVariable("--color-ember") as string;
	const look = TWIG_PRESENTATION[twig.kind];
	const title = twig.title ?? look.title;
	const done = twig.state === "done";
	const skipped = twig.state === "skipped";
	const row = right ? "flex-row-reverse" : "flex-row";
	const reduced = useEffectiveReducedMotion();

	// Entrance and selection are separate layers: the stagger delay belongs to
	// the entrance only, or a tap on a later stop would wait it out again.
	return (
		<EaseView
			animate={{ opacity: 1, scale: 1 }}
			className="absolute"
			initialAnimate={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
			style={{ top, [right ? "right" : "left"]: inset, width }}
			transition={{
				delay: reduced ? 0 : 120 + index * 80,
				duration: reduced ? 200 : 360,
				easing: EASE_OUT,
				type: "timing",
			}}
		>
			<EaseView
				animate={{ scale: selected && !reduced ? 1.06 : 1 }}
				className={cn("items-center gap-3", row)}
				transition={{ duration: 180, easing: EASE_OUT, type: "timing" }}
			>
				<PressableFeedback
					accessibilityHint={
						done ? "Tended" : skipped ? "Not for you" : look.eyebrow
					}
					accessibilityLabel={title}
					accessibilityRole="button"
					accessibilityState={{ selected }}
					className={cn("items-center gap-2", row)}
					onPress={onPress}
				>
					<View
						className={cn(
							"rounded-full p-2.5",
							done ? "bg-ember/40" : selected ? "bg-ember/15" : "bg-transparent"
						)}
					>
						<View
							className={cn(
								"overflow-hidden rounded-full border-4 bg-background",
								done
									? "border-ember"
									: selected
										? "border-foreground/30"
										: "border-background"
							)}
							style={{ height: STOP_NODE, width: STOP_NODE }}
						>
							<View
								className={cn("flex-1 bg-surface", skipped && "opacity-40")}
							>
								<Image
									contentFit={CLEAN_POSES.has(twig.kind) ? "contain" : "cover"}
									source={POSE[twig.kind]}
									style={{ height: "100%", width: "100%" }}
								/>
							</View>
						</View>
						{done && (
							<View
								className="absolute h-8 w-8 items-center justify-center rounded-full border-[3px] border-background bg-ember"
								style={{ bottom: 4, [right ? "left" : "right"]: 4 }}
							>
								<SymbolView
									name={{ android: "check", ios: "checkmark", web: "check" }}
									size={14}
									tintColor={background}
									weight="bold"
								/>
							</View>
						)}
					</View>

					<Surface
						className={cn(
							"max-w-[190px] rounded-2xl px-3.5 py-2.5",
							done && "border-ember",
							skipped && "opacity-40"
						)}
					>
						<View className="flex-row items-center gap-1">
							{done && (
								<SymbolView
									name={{
										android: "local_fire_department",
										ios: "flame.fill",
										web: "local_fire_department",
									}}
									size={11}
									tintColor={ember}
								/>
							)}
							<AppText
								className={cn(
									"text-[10px] uppercase tracking-wider",
									done ? "font-semibold text-ember" : "text-muted"
								)}
							>
								{done ? "Tended" : skipped ? "Passed by" : look.eyebrow}
							</AppText>
						</View>
						<AppText
							className={cn(
								"font-medium text-[15px] text-foreground",
								skipped && "line-through"
							)}
							numberOfLines={2}
						>
							{title}
						</AppText>
					</Surface>
				</PressableFeedback>
			</EaseView>
		</EaseView>
	);
}
