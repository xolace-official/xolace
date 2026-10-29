import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useIsFocused } from "expo-router/react-navigation";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
// Compounding upsell (#524, #496 §4): a free user learns a named domain has
// been heavier than usual, with no number. Seeing the line spends it, once per
// stretch, so the first one found is held for the mount.
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { ViewInstance } from "react-native";
import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import { DOMAIN_META } from "@/features/insights/domains";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

export type Upsell = NonNullable<
	FunctionReturnType<typeof api.compounding.upsell.get>
>;

/** Session end's: upsell.get for its session. Null until there's one to show. */
function useCompoundingUpsell(
	args: { sessionId: Id<"sessions"> } | "skip"
): Upsell | null {
	const { isPlus, isResolved } = usePlusEntitlement();
	const live = useQuery(
		api.compounding.upsell.get,
		isResolved && !isPlus ? args : "skip"
	);
	return useHeldUpsell(live, args === "skip" ? null : args.sessionId);
}

/** Holds the first upsell per key (session id, or "" on Insights) since the query moves on once
 * marked. A null is not held (#529). */
export function useHeldUpsell(
	live: Upsell | null | undefined,
	key: string | null
): Upsell | null {
	const { isPlus, isResolved } = usePlusEntitlement();
	const [held, setHeld] = useState<{ key: string; upsell: Upsell } | null>(
		null
	);
	const current = held && held.key === key ? held.upsell : null;
	if (!current && live && key !== null && isResolved && !isPlus) {
		setHeld({ key, upsell: live });
	}
	return isPlus ? null : current;
}

export function useOpenUpsell() {
	const openPaywall = usePaywall((s) => s.open);
	const posthog = usePostHog();
	return () => {
		playSoftPress();
		posthog.capture("plus_upsell_tapped", { surface: "compounding_upsell" });
		openPaywall("compounding_upsell");
	};
}

/** Scroll listeners where the line can mount below the fold; there it is spent once on screen,
 * else on mount. */
export const UpsellScrollContext = createContext<Set<() => void> | null>(null);

/** `glass` on Insights only: the blur stops rendering under session end's animated opacity. */
export function CompoundingUpsellLine({
	upsell,
	glass = false,
}: {
	upsell: Upsell;
	glass?: boolean;
}) {
	const markShown = useMutation(api.compounding.upsell.markShown);
	const posthog = usePostHog();
	// Shown means seen (CONTEXT.md): spent when on screen on the focused page, not on mount.
	const scroll = use(UpsellScrollContext);
	const isFocused = useIsFocused();
	const { height } = useWindowDimensions();
	const ref = useRef<ViewInstance>(null);
	const [seen, setSeen] = useState(scroll === null);
	const check = useCallback(() => {
		if (seen || !isFocused) {
			return;
		}
		ref.current?.measureInWindow((_x, y, _w, h) => {
			if (h > 0 && y + h / 2 > 0 && y + h / 2 < height) {
				setSeen(true);
			}
		});
	}, [seen, isFocused, height]);
	useEffect(() => {
		if (seen || !isFocused || !scroll) {
			return;
		}
		check();
		scroll.add(check);
		return () => void scroll.delete(check);
	}, [seen, isFocused, scroll, check]);
	const { domain, stretchStartedAt } = upsell;
	useEffect(() => {
		if (!seen) {
			return;
		}
		markShown({ domain, stretchStartedAt }).catch(() => {});
		posthog.capture("plus_upsell_shown", { surface: "compounding_upsell" });
	}, [seen, domain, stretchStartedAt, markShown, posthog]);
	const ember = useTokenColor("ember");
	const open = useOpenUpsell();
	const { label, icon } = DOMAIN_META[upsell.domain];
	const line = `${label} has been heavier lately than your usual.`;
	const pressable = (
		<PressableFeedback
			accessibilityLabel={`${line} See the pattern with Xolace+.`}
			accessibilityRole="button"
			className={`w-full flex-row items-center gap-3 px-4 py-3 ${glass ? "" : "rounded-2xl border border-ember/30 bg-ember/10"}`}
			onPress={open}
		>
			<View className="size-9 items-center justify-center rounded-xl bg-ember/12">
				<SymbolView name={icon} size={17} tintColor={ember} />
			</View>
			<View className="flex-1 gap-0.5">
				<AppText className="text-[14px] text-foreground leading-5">
					{line}
				</AppText>
				<AppText className="font-semibold text-[13px] text-ember">
					See the pattern
				</AppText>
			</View>
		</PressableFeedback>
	);
	return (
		<View onLayout={check} ref={ref}>
			{glass ? (
				<GlassSurface radius={24} tint="ember">
					{pressable}
				</GlassSurface>
			) : (
				pressable
			)}
		</View>
	);
}

/** The session-end line: nothing when there's none, or the user has Xolace+. */
export function SessionEndUpsell({
	sessionId,
}: {
	sessionId?: Id<"sessions">;
}) {
	const upsell = useCompoundingUpsell(sessionId ? { sessionId } : "skip");
	return upsell && <CompoundingUpsellLine upsell={upsell} />;
}
