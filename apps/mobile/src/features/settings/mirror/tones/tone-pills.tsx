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

/**
 * Tone pills under the card (board `.tones`): 36 tall, the shown one filled in ink. A radio
 * group; Witnessed carries a lock on a free account. The row opens with the shown pill in view.
 */
export function TonePills({
	shown,
	chosen,
	plus,
	onPick,
}: {
	/** The pill filled in: the chosen tone, or Witnessed while a free account looks at it. */
	shown: MirrorTone;
	/** The radio's checked pill: the tone the mirror answers in, never a peek. */
	chosen: MirrorTone;
	plus: Entitlement;
	onPick: (tone: MirrorTone) => void;
}) {
	const [background, foreground] = useTokenColors(["background", "foreground"]);
	const row = useRef<ScrollViewInstance>(null);
	// The last two pills sit past the edge, so a row opening on one of them starts at its end.
	// Once: a later size change (larger text) mustn't pull the row back to its end.
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
