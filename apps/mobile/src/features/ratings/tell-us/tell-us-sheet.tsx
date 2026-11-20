import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { EaseView, FADE_IN, fadeTiming } from "@/design/ease";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { TELL_US_COPY as C } from "../copy";
import { SCENE_MOTION } from "../rate/ember-scene";
import { canSend, TELL_US_MAX } from "../ratings-model";
import { useTellUsSheet } from "../tell-us-data";

const BOTTOM = 34;
const FIELD_H = 166;
const BODY_H = 372;
const THANKS_FADE = {
	animate: { opacity: 1 },
	initialAnimate: { opacity: 0 },
	transition: fadeTiming(SCENE_MOTION.fadeMs),
};

function Thanks({ onDone }: { onDone: () => void }) {
	const reduced = useEffectiveReducedMotion();
	return (
		<EaseView {...(reduced ? FADE_IN : THANKS_FADE)}>
			<View
				accessibilityLiveRegion="polite"
				className="items-center justify-center gap-2.5"
				style={{ height: BODY_H }}
			>
				<AppText accessibilityRole="header" center variant="title">
					{C.thanksTitle}
				</AppText>
				<AppText
					center
					className="max-w-[280px] leading-[22px]"
					color="muted"
					variant="subhead"
				>
					{C.thanksBody}
				</AppText>
				<PressScale
					accessibilityLabel={C.done}
					className="mt-[18px] h-[50px] items-center justify-center rounded-full bg-accent-wash px-7"
					onPress={onDone}
				>
					<AppText color="accentInk" variant="subhead" weight="semibold">
						{C.done}
					</AppText>
				</PressScale>
			</View>
		</EaseView>
	);
}

export function TellUsSheet() {
	const { state, actions } = useTellUsSheet();
	const insets = useSafeAreaInsets();
	const ready = canSend(state.text) && !state.limited && !state.sending;

	return (
		<View
			className="px-6 pt-2.5"
			style={{ paddingBottom: Math.max(insets.bottom, BOTTOM) }}
		>
			<Pressable
				accessibilityRole="button"
				className="h-11 justify-center self-start"
				onPress={actions.close}
			>
				<AppText color="accentInk" variant="body" weight="medium">
					{C.cancel}
				</AppText>
			</Pressable>
			{state.sent ? (
				<Thanks onDone={actions.close} />
			) : (
				<View style={{ height: BODY_H }}>
					<AppText accessibilityRole="header" className="mt-3" variant="title">
						{C.title}
					</AppText>
					<AppText
						className="mt-2 leading-[21px]"
						color="muted"
						variant="callout"
					>
						{state.limited ? C.limited : C.body}
					</AppText>
					<AppText
						className="mt-[22px]"
						color="muted"
						nativeID="tell-us-label"
						variant="footnote"
						weight="semibold"
					>
						{C.label}
					</AppText>
					<TextInput
						accessibilityLabel={C.label}
						accessibilityLabelledBy="tell-us-label"
						className="mt-2 rounded-[18px] border border-continuous border-foreground/12 bg-surface px-4 py-3.5 font-normal text-[17px] text-foreground leading-[23px]"
						editable={!(state.limited || state.sending)}
						maxLength={TELL_US_MAX}
						multiline
						onChangeText={actions.setText}
						placeholder={C.placeholder}
						placeholderTextColorClassName="accent-subtle"
						selectionColorClassName="accent-accent"
						style={{ height: FIELD_H, textAlignVertical: "top" }}
						value={state.text}
					/>
					<View className="flex-1" />
					<PressScale
						accessibilityLabel={C.send}
						accessibilityState={{ busy: state.sending, disabled: !ready }}
						className={cn(
							"h-14 items-center justify-center rounded-full",
							ready ? "bg-foreground" : "bg-surface-secondary"
						)}
						disabled={!ready}
						onPress={actions.send}
					>
						<AppText
							color={ready ? "background" : "subtle"}
							variant="body"
							weight="semibold"
						>
							{C.send}
						</AppText>
					</PressScale>
				</View>
			)}
		</View>
	);
}
