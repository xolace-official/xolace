// The talk's composer (#593): [mic mute] [field] [action]. The mic is open the
// whole talk and typing is just another way in. The action shows the live mic
// level while the field is empty and becomes send once there is text. Glass on
// iOS 26; HeroUI's InputGroup on older iOS and Android.

import { isLiquidGlassAvailable } from "expo-glass-effect";
import { SymbolView } from "expo-symbols";
import { InputGroup, useThemeColor } from "heroui-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/components/shared/glass-surface";
import { useCompanionName } from "@/features/talk/use-companion-name";
import type { Talk } from "@/features/talk/use-talk";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const hasGlass = isLiquidGlassAvailable();
const BAR_SHAPE = [0.5, 0.85, 1, 0.75, 0.45];

function LevelBar({
	level,
	shape,
}: {
	level: SharedValue<number>;
	shape: number;
}) {
	const style = useAnimatedStyle(() => ({
		height: 4 + 14 * shape * level.get(),
	}));
	return (
		<Animated.View
			className="w-[3px] rounded-full bg-accent-foreground"
			style={style}
		/>
	);
}

function ActionButton({
	talk,
	hasText,
	onSend,
}: {
	talk: Talk;
	hasText: boolean;
	onSend: () => void;
}) {
	const fg = useThemeColor("accent-foreground");
	if (hasText) {
		return (
			<Pressable
				accessibilityLabel="Send"
				accessibilityRole="button"
				className="size-9 items-center justify-center rounded-full bg-accent"
				onPress={onSend}
			>
				<SymbolView
					name={{ android: "arrow_upward", ios: "arrow.up" }}
					size={16}
					tintColor={fg}
					weight="bold"
				/>
			</Pressable>
		);
	}
	return (
		<View
			accessibilityLabel={talk.isMuted ? "Mic off" : "Listening"}
			className={cn(
				"size-9 flex-row items-center justify-center gap-[2px] rounded-full bg-accent",
				talk.isMuted && "opacity-40"
			)}
		>
			{BAR_SHAPE.map((shape) => (
				<LevelBar key={shape} level={talk.micLevel} shape={shape} />
			))}
		</View>
	);
}

export function TalkComposer({ talk }: { talk: Talk }) {
	const name = useCompanionName();
	const insets = useSafeAreaInsets();
	const muted = useThemeColor("muted");
	const fg = useThemeColor("foreground");
	const [text, setText] = useState("");
	const hasText = text.trim().length > 0;
	const send = () => {
		playSoftPress();
		talk.send(text);
		setText("");
	};
	const action = <ActionButton hasText={hasText} onSend={send} talk={talk} />;
	return (
		<View
			className="flex-row items-end gap-2 px-4 pt-2"
			style={{ paddingBottom: insets.bottom + 8 }}
		>
			<Pressable
				accessibilityLabel={talk.isMuted ? "Unmute mic" : "Mute mic"}
				accessibilityRole="button"
				onPress={talk.toggleMic}
			>
				<GlassSurface interactive radius={22}>
					<View className="size-11 items-center justify-center">
						<SymbolView
							name={
								talk.isMuted
									? { android: "mic_off", ios: "mic.slash.fill" }
									: { android: "mic", ios: "mic.fill" }
							}
							size={18}
							tintColor={talk.isMuted ? muted : fg}
						/>
					</View>
				</GlassSurface>
			</Pressable>
			<View className="flex-1">
				{hasGlass ? (
					<GlassSurface radius={22} tint="accent">
						<View className="min-h-11 flex-row items-end py-1 pr-1 pl-4">
							<TextInput
								className="max-h-28 flex-1 py-2 text-base text-foreground"
								multiline
								onChangeText={setText}
								placeholder={`Speak or message ${name}`}
								placeholderTextColor={muted}
								value={text}
							/>
							{action}
						</View>
					</GlassSurface>
				) : (
					<InputGroup>
						<InputGroup.Input
							className="max-h-28 min-h-11 py-3"
							multiline
							onChangeText={setText}
							placeholder={`Speak or message ${name}`}
							style={{ borderCurve: "continuous", borderRadius: 22 }}
							textAlignVertical="center"
							value={text}
						/>
						<InputGroup.Suffix className="pr-1">{action}</InputGroup.Suffix>
					</InputGroup>
				)}
			</View>
		</View>
	);
}
