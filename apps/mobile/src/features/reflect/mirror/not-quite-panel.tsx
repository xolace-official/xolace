import { type ComponentRef, useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Presets } from "react-native-pulsar";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useKeyboardLift } from "@/lib/keyboard/use-keyboard-lift";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { PANEL } from "../motion";
import { useReflect } from "../reflect-data";
import { NqReasons } from "./nq-reasons";

const AWAY = 1.05;
const UNMEASURED = 600;
const CLOSE: IconName = { android: "close", ios: "xmark" };
const SEND: IconName = { android: "arrow_upward", ios: "arrow.up" };
const CLOSE_SIZE = 13;
const SEND_SIZE = 19;
const HIT = 10;

function placeholderFor(sayMore: boolean, reason: string | null): string {
	if (sayMore) {
		return COPY.notQuite.sayMorePlaceholder;
	}
	const r = COPY.notQuite.reasons.find((x) => x.id === reason);
	return r?.placeholder ?? COPY.notQuite.placeholder;
}

export function NotQuitePanel({ line }: { line: string }) {
	const { state, actions } = useReflect();
	const { nq, sayMore, nqReason, nqText } = state;
	const open = nq || sayMore;
	const [subtle, background, separator, shadow] = useTokenColors([
		"subtle",
		"background",
		"separator",
		"reflect-mirror-panel-shadow",
	]);
	const lift = useKeyboardLift();
	const input = useRef<ComponentRef<typeof TextInput>>(null);
	const h = useSharedValue(UNMEASURED);
	const shown = useSharedValue(open ? 1 : 0);

	useEffect(() => {
		shown.set(
			withTiming(open ? 1 : 0, {
				duration: PANEL.ms,
				easing: PANEL.ease,
				...PLAY_AS_CHOSEN,
			})
		);
		if (!open) {
			input.current?.blur();
		}
	}, [open, shown]);

	const style = useAnimatedStyle(() => ({
		transform: [
			{
				translateY:
					h.get() * AWAY * (1 - shown.get()) + (lift.rest - lift.bottom.get()),
			},
		],
	}));

	const [kept, setKept] = useState(line);
	if (line && line !== kept) {
		setKept(line);
	}
	const ready = nqText.trim().length > 0;

	return (
		<Animated.View
			accessibilityViewIsModal={open}
			className="absolute inset-x-0 bottom-0 gap-3 rounded-t-[30px] border-continuous bg-surface px-4 pt-4"
			importantForAccessibility={open ? "auto" : "no-hide-descendants"}
			onLayout={(e) => h.set(e.nativeEvent.layout.height)}
			pointerEvents={open ? "auto" : "none"}
			style={[
				{
					boxShadow: `0 -1px 0 ${separator}, 0 -20px 40px -24px ${shadow}`,
					paddingBottom: lift.rest,
				},
				style,
			]}
		>
			<View className="flex-row items-start gap-2.5 rounded-[16px] bg-surface-secondary px-3 py-2.5">
				<View className="w-[2.5px] self-stretch rounded-[2px] bg-ember" />
				<AppText
					className="flex-1"
					color="muted"
					numberOfLines={2}
					variant="detail"
				>
					{`“${line || kept}”`}
				</AppText>
				<PressScale
					accessibilityLabel={COPY.notQuite.cancel}
					accessibilityRole="button"
					hitSlop={HIT}
					onPress={actions.closeNotQuite}
				>
					<Icon
						color={subtle}
						name={CLOSE}
						size={CLOSE_SIZE}
						weight="semibold"
					/>
				</PressScale>
			</View>
			<AppText
				accessibilityRole="header"
				className="px-1 text-[19px] leading-[24px] tracking-[-0.3px]"
				variant="body"
				weight="bold"
			>
				{sayMore ? COPY.notQuite.missing : COPY.notQuite.closer}
			</AppText>
			{sayMore ? null : <NqReasons />}
			<View className="flex-row items-end gap-2.5">
				<TextInput
					accessibilityLabel={placeholderFor(sayMore, nqReason)}
					className="max-h-24 min-h-12 flex-1 rounded-[22px] bg-surface-secondary px-4 py-[13px] font-normal text-[16px] text-foreground leading-[22.4px]"
					multiline
					onChangeText={actions.setNqText}
					placeholder={placeholderFor(sayMore, nqReason)}
					placeholderTextColorClassName="accent-subtle"
					ref={input}
					selectionColorClassName="accent-foreground"
					value={nqText}
				/>
				<GlassButton
					accessibilityLabel={COPY.notQuite.send}
					accessibilityRole="button"
					accessibilityState={{ disabled: !ready }}
					className={cn(
						"size-12 items-center justify-center rounded-full",
						!ready && "opacity-28"
					)}
					disabled={!ready}
					haptic={Presets.propel}
					onPress={actions.submitNotQuite}
				>
					<Icon color={background} name={SEND} size={SEND_SIZE} weight="bold" />
				</GlassButton>
			</View>
		</Animated.View>
	);
}
