import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { type ComponentProps, useRef, useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Per card, counted from mount: a double tap's second half lands on the next
// step's freshly mounted card at the same spot, and is dropped.
const DOUBLE_TAP_MS = 500;

type Symbol = Exclude<ComponentProps<typeof SymbolView>["name"], string>;

// Placeholder SF Symbols / Material icons; 3D clay icons are planned (#446).
const ICONS = {
	arrow: { android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" },
	book: { android: "menu_book", ios: "book", web: "menu_book" },
	check: { android: "check", ios: "checkmark", web: "check" },
	close: { android: "close", ios: "xmark", web: "close" },
	cloud: { android: "cloud", ios: "cloud", web: "cloud" },
	flame: {
		android: "local_fire_department",
		ios: "flame.fill",
		web: "local_fire_department",
	},
	lifebuoy: { android: "support", ios: "lifepreserver", web: "support" },
	mic: { android: "mic", ios: "mic", web: "mic" },
	music: { android: "music_note", ios: "music.note", web: "music_note" },
	rain: { android: "rainy", ios: "cloud.rain", web: "rainy" },
	seal: { android: "verified", ios: "checkmark.seal", web: "verified" },
	sun: { android: "wb_sunny", ios: "sun.max", web: "wb_sunny" },
	waveform: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" },
} satisfies Record<string, Symbol>;
export type IconKey = keyof typeof ICONS;

export function Icon({ name, size = 22 }: { name: IconKey; size?: number }) {
	const fg = useThemeColor("foreground") as string;
	return <SymbolView name={ICONS[name]} size={size} tintColor={fg} />;
}

const Bubble = ({ icon }: { icon: IconKey }) => (
	<View className="size-14 items-center justify-center rounded-full bg-background/80">
		<Icon name={icon} size={24} />
	</View>
);

type OptionProps = {
	icon: IconKey;
	tint: string;
	title: string;
	sub?: string;
	a11yLabel?: string;
	onPress: () => void;
};

/** One layer of the check-in stack, sliding under the next (-mb-8 over pb-12). Keep the shape:
 * restyles were rejected in #446. */
export function OptionCard({
	icon,
	tint,
	title,
	sub,
	a11yLabel,
	onPress,
}: OptionProps) {
	const [mountedAt] = useState(Date.now);
	const lastPress = useRef(mountedAt);
	const press = () => {
		const now = Date.now();
		if (now - lastPress.current < DOUBLE_TAP_MS) {
			return;
		}
		lastPress.current = now;
		playSoftPress();
		onPress();
	};
	return (
		<PressableFeedback
			accessibilityLabel={a11yLabel ?? title}
			accessibilityRole="button"
			className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface"
			onPress={press}
		>
			<View className={cn("flex-row items-center gap-4 px-5 pt-5 pb-12", tint)}>
				<Bubble icon={icon} />
				<View className="flex-1">
					<AppText className="font-medium text-foreground text-xl leading-7">
						{title}
					</AppText>
					{sub ? (
						<AppText className="text-foreground/55 text-sm">{sub}</AppText>
					) : null}
				</View>
				<View className="size-14 items-center justify-center rounded-full border border-foreground/20">
					<Icon name="arrow" size={18} />
				</View>
			</View>
		</PressableFeedback>
	);
}
