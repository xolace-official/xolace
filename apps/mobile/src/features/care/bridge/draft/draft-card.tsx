import { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { BODY_MAX_SCALE } from "@/design/type";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { COPY } from "@/features/care/bridge/copy";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const SETTLE_MS = 400;
const LOCK: IconName = { android: "lock", ios: "lock" };
const LOCK_GLYPH = 11;
const DRAFT_LINE = 25.5;
const TOP = { textAlignVertical: "top" } as const;

function Settling({ text }: { text: string }) {
	const reduced = useEffectiveReducedMotion();
	return (
		<Animated.View
			entering={
				reduced
					? undefined
					: FadeIn.duration(SETTLE_MS).reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
			}
		>
			<AppText style={{ lineHeight: DRAFT_LINE }} variant="body">
				{text}
			</AppText>
		</Animated.View>
	);
}

export function DraftCard() {
	const { state, actions } = useBridgeScreen();
	const { text, written } = state.draft;
	const [editing, setEditing] = useState(false);
	const muted = useTokenColor("muted");
	const scheme = useScheme();

	return (
		<View className="gap-3 rounded-[26px] border border-continuous border-separator bg-surface p-4.5">
			<AppText color="muted" variant="overline">
				{COPY.draft.label}
			</AppText>
			{editing ? (
				<TextInput
					accessibilityLabel={COPY.draft.label}
					autoFocus
					className="min-h-50 p-0 font-normal text-[17px] text-foreground leading-[25.5px]"
					keyboardAppearance={scheme}
					maxFontSizeMultiplier={BODY_MAX_SCALE}
					multiline
					onChangeText={actions.setDraft}
					style={TOP}
					value={text}
				/>
			) : (
				<PressScale
					accessibilityHint={COPY.draft.editHint}
					accessibilityLabel={`${COPY.draft.label}. ${text}`}
					card
					className="min-h-50"
					onPress={() => setEditing(true)}
				>
					{written === text ? (
						<Settling text={text} />
					) : (
						<AppText style={{ lineHeight: DRAFT_LINE }} variant="body">
							{text}
						</AppText>
					)}
				</PressScale>
			)}
			<View className="flex-row items-center gap-1.5">
				<Icon color={muted} name={LOCK} size={LOCK_GLYPH} />
				<AppText color="muted" variant="caption">
					{COPY.draft.privacy}
				</AppText>
			</View>
		</View>
	);
}
