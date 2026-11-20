import { useRef } from "react";
import {
	Pressable,
	ScrollView,
	type ScrollViewInstance,
	View,
} from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { MIRROR_ICONS, TONES } from "@/features/settings/mirror/copy";
import {
	type Entitlement,
	type MirrorTone,
	opensAtEnd,
	toneA11y,
} from "@/features/settings/mirror/mirror-model";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";

export function TonePills({
	shown,
	chosen,
	plus,
	onPick,
}: {
	shown: MirrorTone;
	chosen: MirrorTone;
	plus: Entitlement;
	onPick: (tone: MirrorTone) => void;
}) {
	const [background, foreground] = useTokenColors(["background", "foreground"]);
	const row = useRef<ScrollViewInstance>(null);
	const scrollsToEnd = useRef(opensAtEnd(shown));
	return (
		<ScrollView
			accessibilityRole="radiogroup"
			contentContainerClassName="gap-1.5 px-4 pt-3.5"
			horizontal
			onContentSizeChange={() => {
				if (scrollsToEnd.current) {
					scrollsToEnd.current = false;
					row.current?.scrollToEnd({ animated: false });
				}
			}}
			ref={row}
			showsHorizontalScrollIndicator={false}
		>
			{TONES.map((t) => {
				const on = shown === t.id;
				const lock = t.plus && plus === "free";
				return (
					<Pressable
						accessibilityLabel={toneA11y(t.id, plus)}
						accessibilityRole="radio"
						accessibilityState={{ checked: chosen === t.id }}
						className={cn(
							"h-9 flex-row items-center gap-1.25 rounded-full border-separator px-3.5",
							on ? "border-0 bg-foreground" : "border bg-surface"
						)}
						key={t.id}
						onPress={() => {
							if (!on) {
								playSoftPress();
							}
							onPick(t.id);
						}}
					>
						<AppText
							className="text-[15px] leading-5"
							color={on ? "background" : "foreground"}
							variant="body"
							weight="medium"
						>
							{t.label}
						</AppText>
						{lock ? (
							<View className="opacity-55">
								<Icon
									color={on ? background : foreground}
									name={MIRROR_ICONS.lock}
									size={11}
									weight="semibold"
								/>
							</View>
						) : null}
					</Pressable>
				);
			})}
		</ScrollView>
	);
}
