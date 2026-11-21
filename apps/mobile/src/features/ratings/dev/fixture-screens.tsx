import { useState } from "react";
import { RateScreen } from "../rate/rate-screen";
import { RateProvider } from "../rate-data";
import { TellUsSheet } from "../tell-us/tell-us-sheet";
import { type TellUs, TellUsProvider } from "../tell-us-data";
import { WhatsNewScreen } from "../whats-new/whats-new-screen";
import { WhatsNewProvider } from "../whats-new-data";
import { rateFixture, tellUsFixture, WHATS_NEW_FIXTURE } from "./fixtures";

export function FixtureWhatsNew() {
	return (
		<WhatsNewProvider value={WHATS_NEW_FIXTURE}>
			<WhatsNewScreen />
		</WhatsNewProvider>
	);
}

export function FixtureRate({ rated = false }: { rated?: boolean }) {
	const [isRated, setRated] = useState(rated);
	const value = rateFixture(isRated);
	return (
		<RateProvider
			value={{
				...value,
				actions: { ...value.actions, rate: () => setRated(true) },
			}}
		>
			<RateScreen />
		</RateProvider>
	);
}

export function FixtureTellUs(props: Partial<TellUs["state"]>) {
	const [text, setText] = useState(props.text ?? "");
	const [sent, setSent] = useState(props.sent ?? false);
	const value = tellUsFixture({ ...props, sent, text });
	return (
		<TellUsProvider
			value={{
				...value,
				actions: { ...value.actions, send: () => setSent(true), setText },
			}}
		>
			<TellUsSheet />
		</TellUsProvider>
	);
}
