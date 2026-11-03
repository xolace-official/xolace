// PROTOTYPE (#684), throwaway: never merge. The in-app unlock moment: always a
// detached sheet; what changes per variant is how several badges share it.
//   A: one hero at a time, swipe/Next through them, dots below.
//   B: badges fanned in a stack, titles listed, one sparks total.
//   C: the first badge as hero, the rest as compact rows underneath.
import { BottomSheet, PressableFeedback } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetBlurOverlay } from "@/components/bottom-sheet-blur-overlay";
import { AppText } from "@/components/shared/app-text";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { Badge } from "./badge.prototype";
import type { Achievement } from "./catalog.prototype";
import type { VariantKey } from "./variant-switcher.prototype";

type Props = {
	items: Achievement[];
	variant: VariantKey;
	onClose: () => void;
};

export function UnlockSheet({ items, variant, onClose }: Props) {
	const insets = useSafeAreaInsets();
	const [page, setPage] = useState(0);
	const shown = items.map((i) => ({ ...i, earnedAt: "2026-11-03" }));
	const total = shown.reduce((s, i) => s + i.sparks, 0);
	const many = shown.length > 1;
	const paged = variant === "A" || variant === "D";
	const lastPage = !paged || page >= shown.length - 1;

	return (
		<BottomSheet
			isOpen={items.length > 0}
			onOpenChange={(o) => {
				if (!o) {
					setPage(0);
					onClose();
				}
			}}
		>
			<BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
				<BottomSheetBlurOverlay />
				<BottomSheet.Content
					backgroundClassName="rounded-[32px] bg-overlay"
					bottomInset={insets.bottom + 12}
					className="mx-4"
					detached
					enableOverDrag={false}
					handleIndicatorClassName="opacity-0"
				>
					{shown.length > 0 ? (
						<View className="items-center px-6 pt-2 pb-7">
							<AppText className="text-[12px] text-ember uppercase tracking-widest">
								{many ? `${shown.length} new badges` : "New badge"}
							</AppText>

							{paged ? <Hero item={shown[page]} key={shown[page].id} /> : null}

							{variant === "B" ? (
								<>
									<View className="mt-4 h-[190px] w-full flex-row items-center justify-center">
										{shown.map((item, i) => (
											<FanCard
												count={shown.length}
												i={i}
												item={item}
												key={item.id}
											/>
										))}
									</View>
									{shown.map((i) => (
										<AppText
											className="mt-1 text-center font-serif text-[18px] text-foreground"
											key={i.id}
										>
											{i.title}
										</AppText>
									))}
								</>
							) : null}

							{variant === "C" ? (
								<>
									<Hero item={shown[0]} />
									{shown.slice(1).map((item) => (
										<View
											className="mt-3 w-full flex-row items-center gap-3 rounded-2xl bg-surface p-2"
											key={item.id}
										>
											<Badge item={item} size={44} />
											<AppText className="flex-1 font-semibold text-[14px] text-foreground">
												{item.title}
											</AppText>
											<AppText className="pr-2 text-[13px] text-ember">
												+{item.sparks}
											</AppText>
										</View>
									))}
								</>
							) : null}

							{paged && many ? (
								<View className="mt-4 flex-row gap-1.5">
									{shown.map((i, n) => (
										<View
											className={`h-1.5 w-1.5 rounded-full ${n === page ? "bg-foreground" : "bg-separator"}`}
											key={i.id}
										/>
									))}
								</View>
							) : null}

							<AppText className="mt-4 font-bold text-[15px] text-ember">
								+{paged ? shown[page].sparks : total} sparks
							</AppText>

							<PressableFeedback
								accessibilityRole="button"
								className="mt-6 h-13 w-full items-center justify-center rounded-2xl bg-accent"
								onPress={() => (lastPage ? onClose() : setPage((p) => p + 1))}
							>
								<AppText className="font-[Poppins-Medium] text-accent-foreground text-base">
									{lastPage ? "Lovely" : "Next"}
								</AppText>
							</PressableFeedback>
						</View>
					) : null}
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

/** Springs in over a slow ember glow. Stand-in for the shared Skia fx kit. */
function Hero({ item }: { item: Achievement }) {
	const reduced = useEffectiveReducedMotion();
	const scale = useSharedValue(reduced ? 1 : 0.6);
	const glow = useSharedValue(0.25);
	useEffect(() => {
		if (reduced) {
			return;
		}
		scale.set(withSpring(1, { damping: 11, stiffness: 140 }));
		glow.set(
			withRepeat(
				withSequence(
					withTiming(0.55, { duration: 1400 }),
					withTiming(0.25, { duration: 1400 })
				),
				-1
			)
		);
	}, [reduced, scale, glow]);
	const badgeStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));
	const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

	return (
		<View className="mt-3 items-center">
			<View className="h-[200px] w-[200px] items-center justify-center">
				<Animated.View
					className="absolute h-[180px] w-[180px] rounded-full bg-ember"
					style={[glowStyle, { filter: [{ blur: 30 }] }]}
				/>
				<Animated.View style={badgeStyle}>
					<Badge item={item} size={190} />
				</Animated.View>
			</View>
			<AppText className="mt-2 text-center font-serif text-[24px] text-foreground">
				{item.title}
			</AppText>
			<AppText className="mt-2 text-center text-[15px] text-foreground/65 leading-6">
				{item.copy}
			</AppText>
		</View>
	);
}

type FanProps = { item: Achievement; i: number; count: number };

function FanCard({ item, i, count }: FanProps) {
	const reduced = useEffectiveReducedMotion();
	const mid = (count - 1) / 2;
	const rotate = (i - mid) * 12;
	const enter = useSharedValue(reduced ? 1 : 0);
	useEffect(() => {
		if (!reduced) {
			enter.set(withDelay(i * 140, withSpring(1, { damping: 12 })));
		}
	}, [reduced, enter, i]);
	const style = useAnimatedStyle(() => ({
		opacity: enter.get(),
		transform: [
			{ translateX: (i - mid) * 70 * enter.get() },
			{ translateY: Math.abs(i - mid) * 14 },
			{ rotate: `${rotate * enter.get()}deg` },
			{ scale: 0.7 + 0.3 * enter.get() },
		],
	}));
	return (
		<Animated.View
			className="absolute"
			style={[style, { zIndex: count - Math.abs(i - mid) }]}
		>
			<Badge item={item} size={140} />
		</Animated.View>
	);
}
