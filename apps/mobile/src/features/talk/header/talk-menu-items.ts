import type { SFSymbol } from "expo-symbols";
import { TALK_COPY } from "../copy";
import { menuTitle } from "../talk-model";

export type TalkMenuItem = {
	key: string;
	label: string;
	subtitle?: string;
	/** The SF Symbol iOS draws beside it. */
	symbol: SFSymbol;
	enabled: boolean;
	onPress: () => void;
};

export type TalkMenuProps = {
	top: number;
	/** Mid-talk: whole minutes left; null before the talk ("Talk options"). */
	minutesLeft: number | null;
	/** Connected: mute and the two ends work. Get help now always does. */
	live: boolean;
	muted: boolean;
	onMute: () => void;
	onHelp: () => void;
	onEnd: () => void;
	onJustEnd: () => void;
};

/**
 * The ⋯ menu (production's toolbar menu): "{n} min left in this talk"; mute, help, end
 * and make my mirror, or just end. Before the talk it is "Talk options" with only Get help
 * now (handoff §2.1, §4).
 */
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
