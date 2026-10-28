// The moment before the first word (#593): what a talk is, who the companion
// is, what is kept. The microphone is asked for once, from here.

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassSurface } from "@/components/shared/glass-surface";
import {
	MIN_TALK_S,
	PRIVACY_LINE,
	TALK_TIME_RESETS,
	talkTimeLine,
} from "@/features/talk/talk-copy";
import { TalkVoicePicker } from "@/features/talk/talk-voice-picker";
import { useCompanionName } from "@/features/talk/use-companion-name";
import type { Talk } from "@/features/talk/use-talk";
import { useTalkTime } from "@/features/talk/use-talk-time";

function Row({
	icon,
	children,
}: {
	icon: SymbolViewProps["name"];
	children: string;
}) {
	const accent = useThemeColor("accent");
	return (
		<View className="flex-row gap-3">
			<SymbolView name={icon} size={18} tintColor={accent} />
			<AppText className="flex-1 text-foreground text-sm leading-5">
				{children}
			</AppText>
		</View>
	);
}

export function ConsentCard({ talk }: { talk: Talk }) {
	const name = useCompanionName();
	const time = useTalkTime();
	// Under the minimum, Start can't be pressed (#582); the server refuses it too.
	const low = time != null && time.secondsLeft < MIN_TALK_S;
	const label = low
		? TALK_TIME_RESETS
		: talk.started
			? "Starting…"
			: "Start talking";
	return (
		<GlassSurface radius={28}>
			<View className="gap-4 p-5">
				<AppText className="font-semibold text-foreground text-xl">
					Talk it through with {name}
				</AppText>
				<Row icon={{ android: "graphic_eq", ios: "waveform" }}>
					Speak whenever you like, or type. Both land in the same talk.
				</Row>
				<Row icon={{ android: "auto_awesome", ios: "sparkles" }}>
					When you finish, the whole talk becomes your mirror, like any
					reflection.
				</Row>
				<Row icon={{ android: "stop_circle", ios: "stop.circle" }}>
					{`You can end whenever you like, from the menu up top or just tell ${name} you want to end here. Stop wherever feels right; you don't have to go deeper than you want.`}
				</Row>
				<Row icon={{ android: "local_fire_department", ios: "flame" }}>
					{`${name} is an AI, part of Xolace. This talk is remembered with your reflections.`}
				</Row>
				<Row icon={{ android: "schedule", ios: "clock" }}>
					{(time && talkTimeLine(time.secondsLeft)) ??
						"A talk lasts up to 15 minutes."}
				</Row>
				<Row icon={{ android: "lock", ios: "lock" }}>{PRIVACY_LINE}</Row>
				<View className="gap-2">
					<AppText className="font-medium text-muted text-xs">{`${name}'s voice`}</AppText>
					<TalkVoicePicker />
				</View>
				<Button isDisabled={talk.started || low} onPress={talk.start}>
					<Button.Label>{label}</Button.Label>
				</Button>
				{talk.error ? (
					<AppText className="text-center text-danger text-xs">
						{talk.error}
					</AppText>
				) : (
					<AppText className="text-center text-muted text-xs">
						{low
							? "You can still write a reflection any time."
							: "We will ask for the microphone once."}
					</AppText>
				)}
			</View>
		</GlassSurface>
	);
}
