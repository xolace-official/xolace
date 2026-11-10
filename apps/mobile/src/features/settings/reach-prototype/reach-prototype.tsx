/**
 * PROTOTYPE (#733) — throwaway, branch prototype/reach-me-on-screen only.
 * Three variants of "Reach me on…" mounted at the top of the existing Notifications screen,
 * switched by `?variant=A|B|C`, with `?state=` for the channel state and `?offer=1` for the
 * after-check-in offer. Floating bar is dev-only.
 */
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import {
	FAKE_STATES,
	type FakeState,
	useFakeChannels,
} from "@/features/settings/reach-prototype/fake-channels";
import { OfferCard } from "@/features/settings/reach-prototype/offer-card";
import { Notice } from "@/features/settings/reach-prototype/proto-ui";
import {
	VARIANT_A_NAME,
	VariantA,
} from "@/features/settings/reach-prototype/variant-a-ordered-list";
import {
	VARIANT_B_NAME,
	VariantB,
} from "@/features/settings/reach-prototype/variant-b-cards-sheet";
import {
	VARIANT_C_NAME,
	VariantC,
} from "@/features/settings/reach-prototype/variant-c-one-choice";

const VARIANTS = ["A", "B", "C"] as const;
type Variant = (typeof VARIANTS)[number];
const NAMES: Record<Variant, string> = {
	A: VARIANT_A_NAME,
	B: VARIANT_B_NAME,
	C: VARIANT_C_NAME,
};

type Params = { variant?: string; state?: string; offer?: string };

export function useReachPrototypeParams() {
	const p = useLocalSearchParams<Params>();
	const variant = (VARIANTS as readonly string[]).includes(p.variant ?? "")
		? (p.variant as Variant)
		: null;
	const state = (FAKE_STATES as string[]).includes(p.state ?? "")
		? (p.state as FakeState)
		: "unlinked";
	return { offer: p.offer === "1", state, variant };
}

const Body = ({
	variant,
	state,
	offer,
}: {
	variant: Variant;
	state: FakeState;
	offer: boolean;
}) => {
	const ch = useFakeChannels(state);
	return (
		<View>
			<Notice text={ch.notice} />
			{offer && <OfferCard ch={ch} />}
			{variant === "A" && <VariantA ch={ch} />}
			{variant === "B" && <VariantB ch={ch} />}
			{variant === "C" && <VariantC ch={ch} />}
		</View>
	);
};

/** Rendered at the top of NotificationsScreen's scroll when `?variant=` is set. */
export const ReachPrototypeTop = () => {
	const { variant, state, offer } = useReachPrototypeParams();
	if (!variant) {
		return null;
	}
	// Remount on every switch so each variant/state starts fresh.
	return (
		<Body
			key={`${variant}-${state}-${offer}`}
			offer={offer}
			state={state}
			variant={variant}
		/>
	);
};

const cycle = <T,>(list: readonly T[], cur: T, dir: 1 | -1) =>
	list[(list.indexOf(cur) + dir + list.length) % list.length] as T;

const BarButton = ({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) => (
	<Pressable
		accessibilityRole="button"
		className="px-3 py-2"
		hitSlop={6}
		onPress={onPress}
	>
		<AppText className="font-semibold text-background">{label}</AppText>
	</Pressable>
);

/** Floating switcher, visibly not part of the design. Hidden outside dev builds. */
export const ReachPrototypeSwitcher = () => {
	const insets = useSafeAreaInsets();
	const { variant, state, offer } = useReachPrototypeParams();
	if (!(__DEV__ && variant)) {
		return null;
	}
	return (
		<View
			className="absolute right-3 left-3 items-center"
			pointerEvents="box-none"
			style={{ bottom: insets.bottom + 8 }}
		>
			<View className="gap-1 rounded-3xl bg-foreground px-2 py-1 shadow-lg">
				<View className="flex-row items-center">
					<BarButton
						label="◀"
						onPress={() =>
							router.setParams({ variant: cycle(VARIANTS, variant, -1) })
						}
					/>
					<AppText className="min-w-48 text-center text-background text-sm">
						{variant} · {NAMES[variant]}
					</AppText>
					<BarButton
						label="▶"
						onPress={() =>
							router.setParams({ variant: cycle(VARIANTS, variant, 1) })
						}
					/>
				</View>
				<View className="flex-row items-center justify-center">
					<BarButton
						label="‹"
						onPress={() =>
							router.setParams({ state: cycle(FAKE_STATES, state, -1) })
						}
					/>
					<AppText className="min-w-28 text-center text-background/80 text-xs">
						state: {state}
					</AppText>
					<BarButton
						label="›"
						onPress={() =>
							router.setParams({ state: cycle(FAKE_STATES, state, 1) })
						}
					/>
					<BarButton
						label={offer ? "offer ✓" : "offer"}
						onPress={() => router.setParams({ offer: offer ? "0" : "1" })}
					/>
				</View>
			</View>
		</View>
	);
};
