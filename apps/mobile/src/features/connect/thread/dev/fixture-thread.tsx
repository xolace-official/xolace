import { useState } from "react";
import { NOW } from "../../dev/fixtures";
import { deviceClock } from "../../device-clock";
import {
	XolacerProvider,
	type XolacerScreenData,
} from "../../xolacer/xolacer-data";
import { type Profile, xolacerState } from "../../xolacer/xolacer-model";
import { XolacerScreen } from "../../xolacer/xolacer-screen";
import { ThreadProvider, type ThreadScreenData } from "../thread-data";
import {
	type StreamStatus,
	type ThreadConversation,
	threadState,
} from "../thread-model";
import { ThreadScreen } from "../thread-screen";
import type { DevMessage } from "./dev-messages";
import { DevChat, useDevChannel, useDevTyping } from "./dev-stream";

const noop = () => undefined;

function settled<T>(
	value: T,
	phase?: "loading" | "gone"
): T | null | undefined {
	if (phase === "loading") {
		return undefined;
	}
	return phase === "gone" ? null : value;
}

export function FixtureThread({
	conversation,
	messages = [],
	stream = "ready",
	typing = false,
	liveTyping = false,
	online = true,
	lastHere,
	phase,
}: {
	conversation: ThreadConversation;
	messages?: readonly DevMessage[];
	stream?: StreamStatus;
	typing?: boolean;
	liveTyping?: boolean;
	online?: boolean;
	lastHere?: number;
	phase?: "loading" | "gone";
}) {
	const { client, channel } = useDevChannel(
		messages,
		conversation.streamChannelId ?? "dev-none",
		typing,
		lastHere === undefined
			? {}
			: {
					author: {
						id: conversation.counterpartProfileId,
						last_active: new Date(Date.now() - lastHere).toISOString(),
						name: conversation.counterpartName,
						online: false,
					},
				}
	);
	useDevTyping(client, channel, liveTyping);
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
		state: threadState({
			answering: false,
			blocking: { open: blockOpen, pending: false },
			channel,
			conversation: settled(conversation, phase),
			stream,
		}),
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
	specialty,
}: {
	profile: Profile;
	phase?: "loading" | "gone";
	specialty?: string;
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
		state: xolacerState({
			blocking: { open: blockOpen, pending: false },
			locale: deviceClock().locale,
			now: NOW,
			primer: primerMode,
			profile: settled(profile, phase),
			sending: false,
			specialty,
		}),
	};
	return (
		<XolacerProvider value={value}>
			<XolacerScreen />
		</XolacerProvider>
	);
}
