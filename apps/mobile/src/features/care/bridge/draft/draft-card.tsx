import { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { sentencesOf } from "@/features/care/bridge/bridge-model";
import { COPY } from "@/features/care/bridge/copy";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

/** A written draft settles in a sentence at a time, 270 ms apart, each over 400 ms. */
const SETTLE_STEP_MS = 270;
const SETTLE_MS = 400;
const LOCK: IconName = { android: "lock", ios: "lock" };
const LOCK_GLYPH = 11;
const DRAFT_LINE = 25.5;
const TOP = { textAlignVertical: "top" } as const;

function Settling({ text }: { text: string }) {
	const reduced = useEffectiveReducedMotion();
	const sentences = sentencesOf(text);
	return (
		<AppText style={{ lineHeight: DRAFT_LINE }} variant="body">
			{sentences.map((s, i) => (
				<Animated.Text
					entering={
						reduced
							? undefined
							: FadeIn.duration(SETTLE_MS)
									.delay(i * SETTLE_STEP_MS)
									.reduceMotion(PLAY_AS_CHOSEN.reduceMotion)
					}
					// Sentences don't move: the index is their identity.
					key={i}
				>
					{i < sentences.length - 1 ? `${s} ` : s}
				</Animated.Text>
			))}
		</AppText>
	);
}

/** The draft, the hero: plainly yours, and editable with a tap. */
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
