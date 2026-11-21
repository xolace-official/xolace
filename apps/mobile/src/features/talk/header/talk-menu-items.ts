import type { SFSymbol } from "expo-symbols";
import { TALK_COPY } from "../copy";
import { menuTitle } from "../talk-model";

export type TalkMenuItem = {
	key: string;
	label: string;
	subtitle?: string;
	symbol: SFSymbol;
	enabled: boolean;
	onPress: () => void;
};

export type TalkMenuProps = {
	top: number;
	minutesLeft: number | null;
	live: boolean;
	muted: boolean;
	onMute: () => void;
	onHelp: () => void;
	onEnd: () => void;
	onJustEnd: () => void;
};

export function talkMenu(p: TalkMenuProps): {
	title: string;
	items: TalkMenuItem[];
} {
	const { live } = TALK_COPY;
	return {
		items: [
			{
				enabled: p.live,
				key: "mute",
				label: p.muted ? live.unmute : live.mute,
				onPress: p.onMute,
				symbol: p.muted ? "mic" : "mic.slash",
			},
			{
				enabled: true,
				key: "help",
				label: live.help,
				onPress: p.onHelp,
				symbol: "lifepreserver",
			},
			{
				enabled: p.live,
				key: "end",
				label: live.endMirror,
				onPress: p.onEnd,
				symbol: "sparkles",
			},
			{
				enabled: p.live,
				key: "just-end",
				label: live.justEnd,
				onPress: p.onJustEnd,
				subtitle: live.mirrorLater,
				symbol: "stop.circle",
			},
		],
		title: menuTitle(p.minutesLeft),
	};
}
