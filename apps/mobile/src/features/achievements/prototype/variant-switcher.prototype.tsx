// PROTOTYPE (#684), throwaway: never merge. Floating bar that flips `?variant=`
// and fires a fake unlock, so the unlock sheet can be judged in place.
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";

export const VARIANTS = {
	A: "Shelf rows",
	B: "Trophy case",
	C: "Ladders",
} as const;
export type VariantKey = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as VariantKey[];

export function useVariant(): VariantKey {
	const { variant } = useLocalSearchParams<{ variant?: string }>();
	return KEYS.includes(variant as VariantKey) ? (variant as VariantKey) : "A";
}

type Props = { onUnlock?: (count: 1 | 3) => void };

export function VariantSwitcher({ onUnlock }: Props) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const current = useVariant();
	if (!__DEV__) {
		return null;
	}
	const step = (by: number) => {
		const next = KEYS[(KEYS.indexOf(current) + by + KEYS.length) % KEYS.length];
		router.setParams({ variant: next });
	};
	return (
		<View
			className="absolute flex-row items-center gap-1 self-center rounded-full bg-foreground px-2 py-1.5"
			pointerEvents="box-none"
			style={{ bottom: insets.bottom + 8 }}
		>
			<Pill label="‹" onPress={() => step(-1)} />
			<AppText className="px-2 font-semibold text-[13px] text-background">
				{current} ({VARIANTS[current]})
			</AppText>
			<Pill label="›" onPress={() => step(1)} />
			{onUnlock ? (
				<>
					<Pill label="Unlock 1" onPress={() => onUnlock(1)} />
					<Pill label="Unlock 3" onPress={() => onUnlock(3)} />
				</>
			) : null}
		</View>
	);
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className="rounded-full bg-background/15 px-3 py-1.5"
			hitSlop={6}
			onPress={onPress}
		>
			<AppText className="font-semibold text-[13px] text-background">
				{label}
			</AppText>
		</Pressable>
	);
}
