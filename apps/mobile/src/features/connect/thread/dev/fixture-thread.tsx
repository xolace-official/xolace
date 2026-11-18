/** The thread and a profile on fixtures, through the same providers as the app. */
import { useState } from "react";
import type { AgeGate } from "../../age-gate/use-age-gate";
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
import {
	DevChat,
	type DevMessage,
	useDevChannel,
	useDevTyping,
} from "./dev-stream";

const noop = () => undefined;

/** A fixture as the query returns it: `undefined` while loading, `null` once gone. */
function settled<T>(
	value: T,
	phase?: "loading" | "gone"
): T | null | undefined {
	if (phase === "loading") {
		return undefined;
	}
	return phase === "gone" ? null : value;
}

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
	typing = false,
	liveTyping = false,
	online = true,
	phase,
}: {
	conversation: ThreadConversation;
	messages?: readonly DevMessage[];
	stream?: StreamStatus;
	/** Maya is typing as the state opens. Her presence is the dev channel's: here. */
	typing?: boolean;
	/** Maya types on and off, through the client, for as long as the state is open. */
	liveTyping?: boolean;
	online?: boolean;
	phase?: "loading" | "gone";
}) {
	const { client, channel } = useDevChannel(
		messages,
		conversation.streamChannelId ?? "dev-none",
		typing
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
		ageGate: AGE_GATE,
		state: threadState({
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
	/** The route's specialty, as the roster's filter passes it. */
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
		ageGate: AGE_GATE,
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
