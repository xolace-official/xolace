import { useEffect, useEffectEvent } from "react";
import { AccessibilityInfo } from "react-native";
import { TALK_COPY } from "./copy";
import type { TalkScreen } from "./talk-data";

const say = (message: string) =>
	AccessibilityInfo.announceForAccessibility(message);

/**
 * What a screen reader hears without moving focus: each finished line (the caption is a
 * live region), a talk error, and the people who can help when the server raises crisis.
 */
export function useTalkAnnouncements(state: TalkScreen["state"]) {
	const before = state.phase === "start";
	const latest = state.turns.at(-1);
	const finished = latest && !latest.live ? latest.id : -1;
	const crisis = state.help?.level === "crisis" && !before;

	const sayLine = useEffectEvent(() => {
		if (latest && !before) {
			const who = latest.speaker === "person" ? TALK_COPY.live.you : state.name;
			say(`${who}: ${latest.text}`);
		}
	});
	useEffect(() => {
		if (finished >= 0) {
			sayLine();
		}
	}, [finished]);

	useEffect(() => {
		if (state.error) {
			say(state.error);
		}
	}, [state.error]);

	useEffect(() => {
		if (crisis) {
			say(TALK_COPY.live.helpPeople);
		}
	}, [crisis]);
}
