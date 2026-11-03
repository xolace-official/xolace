// The badge unlock moment (#693): a full-screen route over wherever the user
// is, one new badge at a time. Opened by useBadgeUnlock in the protected
// layout; the close button, the last button and Android back all dismiss it.

import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "@/features/achievements/badge";
import { BadgeFx, FX_SPILL } from "@/features/achievements/fx/badge-fx";
import type { UnlockedBadge } from "@/features/achievements/types";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";
import { cn } from "@/lib/utils";

const SIDE_GUTTER = 72;
const MAX_HERO = 240;
const ENTER_SPRING = { damping: 11, stiffness: 140 };

export function BadgeUnlockScreen() {
	const insets = useSafeAreaInsets();
	const live = useQuery(api.achievements.unlock.unseen);
	const markSeen = useMutation(api.achievements.unlock.markSeen);
	// What opened the moment, held still: a badge earned while it's up waits for the next one.
	const [shown, setShown] = useState<UnlockedBadge[] | null>(null);
	const [step, setStep] = useState(0);
	const shownIds = useRef<Id<"user_achievements">[]>([]);

	if (shown === null && live && live.length > 0) {
		setShown(live);
	}
	useEffect(() => {
		shownIds.current = shown?.map((b) => b.id) ?? [];
	}, [shown]);

	// Nothing left to show (seen on another device, an old link): step aside.
	const empty = shown === null && live?.length === 0;
	useEffect(() => {
		if (empty) {
			router.back();
		}
	}, [empty]);

	// Stamp on the way out, however it closes. An app killed while this is up shows it again.
	useEffect(
		() => () => {
			const ids = shownIds.current;
			if (ids.length > 0) {
				markSeen({ ids }).catch(() => undefined);
			}
		},
		[markSeen]
	);

	const badge = shown?.[step];
	if (!(shown && badge)) {
		return <View className="flex-1 bg-background" />;
	}
	const last = step >= shown.length - 1;

	return (
		<View
			className="flex-1 bg-background px-6"
			style={{ paddingBottom: insets.bottom + 16, paddingTop: insets.top + 8 }}
		>
			<View className="flex-row justify-end">
				<CloseButton />
			</View>
			<View className="flex-1 items-center justify-center">
				<AppText className="text-[12px] text-ember uppercase tracking-widest">
					{shown.length > 1 ? `${shown.length} new badges` : "New badge"}
				</AppText>
				<Hero badge={badge} key={badge.id} />
				<AppText
					accessibilityRole="header"
					className="text-center font-serif text-[30px] text-foreground leading-9"
				>
					{badge.title}
				</AppText>
				<AppText className="mt-3 text-center text-[16px] text-foreground/65 leading-6">
					{badge.copy}
				</AppText>
				<AppText className="mt-4 font-semibold text-[15px] text-ember">
					+{badge.sparks} {badge.sparks === 1 ? "spark" : "sparks"}
				</AppText>
			</View>
			{shown.length > 1 ? (
				<Dots ids={shown.map((b) => b.id)} step={step} />
			) : null}
			<PressableFeedback
				accessibilityRole="button"
				className="h-13 w-full items-center justify-center rounded-2xl bg-accent"
				onPress={() => (last ? router.back() : setStep(step + 1))}
			>
				<AppText className="font-[Poppins-Medium] text-accent-foreground text-base">
					{last ? "Lovely" : "Next"}
				</AppText>
			</PressableFeedback>
		</View>
	);
}

/** Springs in over the fx kit's glow; reduced motion shows the plain badge, still. */
function Hero({ badge }: { badge: UnlockedBadge }) {
	const reduced = useEffectiveReducedMotion();
	const { width } = useWindowDimensions();
	const size = Math.min(width - SIDE_GUTTER * 2, MAX_HERO);
	const enter = useSharedValue(reduced ? 1 : 0);
	useEffect(() => {
		if (!reduced) {
			enter.set(withSpring(1, ENTER_SPRING));
		}
	}, [reduced, enter]);
	const style = useAnimatedStyle(() => ({
		opacity: Math.min(enter.get(), 1),
		transform: [{ scale: 0.6 + 0.4 * enter.get() }],
	}));
	const { art, title } = badge;

	return (
		// Room for the fx spill, so sparkles never land on the eyebrow or title.
		<Animated.View style={[style, { marginVertical: size * FX_SPILL }]}>
			{art.url && !art.fallback && !reduced ? (
				<BadgeFx accessibilityLabel={title} size={size} url={art.url} />
			) : (
				// Any earnedAt lights it; the fallback art stays unlit either way.
				<Badge achievement={{ art, earnedAt: 0, title }} size={size} />
			)}
		</Animated.View>
	);
}

function Dots({ ids, step }: { ids: string[]; step: number }) {
	return (
		<View
			accessibilityLabel={`Badge ${step + 1} of ${ids.length}`}
			accessible
			className="mb-6 flex-row justify-center gap-1.5"
		>
			{ids.map((id, i) => (
				<View
					className={cn(
						"size-1.5 rounded-full",
						i === step ? "bg-foreground" : "bg-separator"
					)}
					key={id}
				/>
			))}
		</View>
	);
}

function CloseButton() {
	const foreground = useTokenColor("foreground");
	return (
		<PressableFeedback
			accessibilityLabel="Close"
			accessibilityRole="button"
			className="size-10 items-center justify-center rounded-full bg-foreground/10"
			hitSlop={8}
			onPress={() => router.back()}
		>
			<SymbolView
				name={{ android: "close", ios: "xmark", web: "close" }}
				size={14}
				tintColor={foreground}
			/>
		</PressableFeedback>
	);
}
