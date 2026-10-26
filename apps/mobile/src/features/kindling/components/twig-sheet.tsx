import { Image } from "expo-image";
import { Spinner, useThemeColor } from "heroui-native";
import { Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { Button } from "@/src/components/shared/playful-button";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { useEffectiveReducedMotion } from "@/src/lib/motion/use-effective-reduced-motion";
import { useIsPlayful } from "@/src/lib/playful/use-playful";
import { cn } from "@/src/lib/utils";
import {
	TWIG_PRESENTATION,
	type Twig,
	twigBrowseHref,
} from "../twig-presentation";

/**
 * The open twig, floating over the bottom of the trail: why, "Browse more
 * like this" for a bound track, then "Not for me" and the primary action.
 * Tended collapses the actions to a "Tended" line; skipped to "Not for you".
 */
export function TwigSheet({
	twig,
	bottom,
	matching = false,
	onBegin,
	onSkip,
	onBrowseMore,
	onHeight,
}: {
	twig: Twig;
	bottom: number;
	/** A xolacer twig's match is in flight (#570): the button says so and holds. */
	matching?: boolean;
	onBegin: () => void;
	onSkip: () => void;
	onBrowseMore: () => void;
	onHeight: (height: number) => void;
}) {
	const look = TWIG_PRESENTATION[twig.kind];
	const done = twig.state === "done";
	const skipped = twig.state === "skipped";
	const browsable = twigBrowseHref(twig) !== null;
	const reduced = useEffectiveReducedMotion();
	const accentForeground = useThemeColor("accent-foreground") as string;
	const isPlayful = useIsPlayful();

	return (
		<EaseView
			animate={{ opacity: 1, translateY: 0 }}
			className={cn(
				"absolute right-3 left-3 rounded-3xl border border-border bg-surface p-5",
				isPlayful ? "border-2 shadow-surface" : "shadow-lg"
			)}
			// Remounts per twig, and switching stops is a frequent tap: short and
			// ease-out so the new card is readable at once, not a 300ms ease-in-out.
			initialAnimate={{ opacity: 0, translateY: reduced ? 0 : 10 }}
			key={twig._id}
			onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
			style={{ bottom }}
			transition={{ duration: 180, easing: [0.23, 1, 0.32, 1], type: "timing" }}
		>
			<View className="flex-row items-center gap-3">
				<View className="flex-1">
					<AppText className="text-[11px] text-muted uppercase tracking-wider">
						{look.eyebrow}
					</AppText>
					<AppText
						className={`mt-1 font-semibold text-xl ${skipped ? "text-muted line-through" : "text-foreground"}`}
					>
						{twig.title ?? look.title}
					</AppText>
				</View>
				<Image
					contentFit="contain"
					source={look.image}
					style={{ height: 56, opacity: skipped ? 0.4 : 0.8, width: 56 }}
				/>
			</View>
			{twig.detail ? (
				<AppText
					className={cn(
						"mt-2 text-[15px] leading-relaxed",
						skipped ? "text-muted" : "text-foreground"
					)}
				>
					{twig.detail}
				</AppText>
			) : null}
			<AppText className="mt-2 text-[15px] text-muted leading-relaxed">
				{removeEmDash(twig.why)}
			</AppText>
			{browsable && !done && !skipped && (
				<Pressable
					accessibilityLabel="Browse more like this"
					accessibilityRole="link"
					className="mt-3 self-start"
					hitSlop={8}
					onPress={onBrowseMore}
				>
					<AppText className="text-muted text-sm underline">
						Browse more like this
					</AppText>
				</Pressable>
			)}

			{done ? (
				<AppText className="mt-4 font-medium text-ember text-sm">
					Tended
				</AppText>
			) : skipped ? (
				<AppText className="mt-4 text-muted text-sm">Not for you</AppText>
			) : (
				<View className="mt-4 flex-row items-center justify-between">
					<Pressable
						accessibilityRole="button"
						className={matching ? "opacity-40" : undefined}
						disabled={matching}
						hitSlop={8}
						onPress={onSkip}
					>
						<AppText className="text-muted text-sm">Not for me</AppText>
					</Pressable>
					<Button
						accessibilityState={{ busy: matching }}
						isDisabled={matching}
						onPress={onBegin}
						size="sm"
					>
						{matching ? <Spinner color={accentForeground} size="sm" /> : null}
						<Button.Label>
							{matching ? "Finding someone" : look.actionLabel}
						</Button.Label>
					</Button>
				</View>
			)}
		</EaseView>
	);
}
