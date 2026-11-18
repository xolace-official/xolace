/** The thread and a profile on fixtures, through the same providers as the app. */
import { useState } from "react";
import type { AgeGate } from "../../age-gate/use-age-gate";
import { rateCtaState } from "../../chat-rules";
import { NOW } from "../../dev/fixtures";
import {
	XolacerProvider,
	type XolacerScreenData,
} from "../../xolacer/xolacer-data";
import { type Profile, profileView } from "../../xolacer/xolacer-model";
import { XolacerScreen } from "../../xolacer/xolacer-screen";
import { ThreadProvider, type ThreadScreenData } from "../thread-data";
import {
	type Activity,
	type StreamStatus,
	statusBar,
	type ThreadConversation,
	threadBody,
	threadSubtitle,
} from "../thread-model";
import { ThreadScreen } from "../thread-screen";
import { DevChat, type DevMessage, useDevChannel } from "./dev-stream";

const noop = () => undefined;

const AGE_GATE: AgeGate = {
	close: noop,
	dateOfBirth: null,
	decline: noop,
	guard: (proceed) => proceed(),
	handleRefusal: () => false,
	saving: false,
	setDateOfBirth: noop,
	step: null,
	submit: noop,
};

export function FixtureThread({
	conversation,
	messages = [],
	stream = "ready",
	activity = { presence: { online: true }, typing: false },
	online = true,
	phase,
}: {
	conversation: ThreadConversation;
	messages?: readonly DevMessage[];
	stream?: StreamStatus;
	activity?: Activity;
	online?: boolean;
	phase?: "loading" | "gone";
}) {
	const { client, channel } = useDevChannel(
		messages,
		conversation.streamChannelId ?? "dev-none",
		activity.typing
	);
	const [blockOpen, setBlockOpen] = useState(false);
	const value: ThreadScreenData = {
		actions: {
			accept: noop,
			askBlock: () => setBlockOpen(true),
			cancelBlock: () => setBlockOpen(false),
			confirmBlock: () => setBlockOpen(false),
			decline: noop,
			findAnother: noop,
			flag: noop,
			openHelp: noop,
			openProfile: noop,
			openResource: noop,
			rate: noop,
			report: noop,
			resume: noop,
			retry: noop,
		},
		ageGate: AGE_GATE,
		state: phase
			? { phase }
			: {
					bar: statusBar(conversation),
					blocking: {
						history: Boolean(conversation.streamChannelId),
						open: blockOpen,
						pending: false,
					},
					body: threadBody(conversation, stream),
					channel,
					conversation,
					phase: "ready",
					rate: rateCtaState(conversation),
					subtitle: threadSubtitle(conversation, activity, NOW),
				},
	};
	return (
		<DevChat client={client} online={online}>
			<ThreadProvider value={value}>
				<ThreadScreen />
			</ThreadProvider>
		</DevChat>
	);
}

export function FixtureXolacer({
	profile,
	phase,
	others = null,
}: {
	profile: Profile;
	phase?: "loading" | "gone";
	others?: string | null;
}) {
	const [blockOpen, setBlockOpen] = useState(false);
	const [primerMode, setPrimer] = useState<"gate" | "reference" | null>(null);
	const value: XolacerScreenData = {
		actions: {
			ask: () => setPrimer("gate"),
			askBlock: () => setBlockOpen(true),
			cancelBlock: () => setBlockOpen(false),
			closePrimer: () => setPrimer(null),
			confirmBlock: () => setBlockOpen(false),
			confirmPrimer: () => setPrimer(null),
			edit: noop,
			openChat: noop,
			openPrimer: () => setPrimer("reference"),
			others: noop,
			rate: noop,
			report: noop,
		},
		ageGate: AGE_GATE,
		state: phase
			? { phase }
			: {
					blocking: { history: false, open: blockOpen, pending: false },
					id: profile.xolacerProfileId,
					isSelf: profile.isSelf,
					menu: profile.isSelf
						? null
						: {
								canBlock: profile.conversation !== null,
								rate: rateCtaState(profile),
							},
					muted: !profile.available,
					others,
					phase: "ready",
					photoUrl: profile.photoUrl,
					present: profile.present,
					primer: primerMode,
					sending: false,
					view: profileView(profile, NOW),
				},
	};
	return (
		<XolacerProvider value={value}>
			<XolacerScreen />
		</XolacerProvider>
	);
}
