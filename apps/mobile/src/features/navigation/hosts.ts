import { type ComponentType, createElement, useState } from "react";
import { ArrivalsHost } from "@/features/achievements/arrival/arrivals-host";
import { AgeAskHost } from "@/features/connect/age-gate/age-ask-host";
import { FeedbackShake } from "@/features/feedback/shake/feedback-shake";
import { useLaunch, useLaunchRevealed } from "@/features/launch/launch-store";
import { LateRiskHost } from "@/features/letters/late-risk-host";
import { isPresentedRoute } from "@/features/navigation/presented-routes";
import { GoneHost } from "@/features/peer-reflection/gone-host";
import { NowPlayingHost } from "@/features/player/now-playing/now-playing-host";
import { ReminderHandoverHost } from "@/features/quotes/reminders/reminder-handover-host";
import { OpenAskHost } from "@/features/ratings/open-ask-host";

export type RootHost = {
	readonly name: string;
	readonly Host: ComponentType;
};

function Arrivals() {
	return createElement(ArrivalsHost, { isPresented: isPresentedRoute });
}

function LateRisk() {
	return createElement(LateRiskHost, { isPresented: isPresentedRoute });
}

function OpenAsk() {
	const [firstRun] = useState(() => useLaunch.getState().phase === "gone");
	return createElement(OpenAskHost, {
		firstRun,
		revealed: useLaunchRevealed(),
	});
}

export const ROOT_HOSTS: readonly RootHost[] = [
	{ Host: Arrivals, name: "arrivals" },
	{ Host: GoneHost, name: "peer-reflections-gone" },
	{ Host: NowPlayingHost, name: "now-playing" },
	{ Host: AgeAskHost, name: "age-ask" },
	{ Host: LateRisk, name: "letters-late-risk" },
	{ Host: ReminderHandoverHost, name: "daily-quote-handover" },
	{ Host: FeedbackShake, name: "feedback-shake" },
	{ Host: OpenAsk, name: "open-ask" },
];
