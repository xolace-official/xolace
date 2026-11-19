import { useState } from "react";
import { STATUS_OPEN } from "../../dev/fixtures";
import type {
	LettersStatus,
	ReceivedLetter,
	SentLetter,
} from "../../letters-model";
import { type LettersHub, LettersHubProvider } from "../hub-data";
import { LettersScreen } from "../letters-screen";

export type HubFixture = {
	status?: Partial<LettersStatus>;
	sent?: readonly SentLetter[];
	received?: readonly ReceivedLetter[];
	opens?: Partial<LettersHub["state"]["opens"]>;
};

/**
 * The Letters screen on fixtures. Taps change only this state, so the offer, Turn on and
 * Withdraw play out as they would, and nothing reaches the letters data module.
 */
export function HubFixtureScreen({ fixture }: { fixture: HubFixture }) {
	const [status, setStatus] = useState<LettersStatus>({
		...STATUS_OPEN,
		...fixture.status,
	});
	const [sent, setSent] = useState(fixture.sent ?? []);
	const value: LettersHub = {
		actions: {
			answerOffer: (optIn) => setStatus((s) => ({ ...s, optIn })),
			dismiss: (id) => setSent((all) => all.filter((l) => l.id !== id)),
			markSeen: (ids) =>
				setSent((all) =>
					all.map((l) => (ids.includes(l.id) ? { ...l, seen: true } : l))
				),
			turnOn: () => setStatus((s) => ({ ...s, optIn: "yes" })),
			withdraw: (id) => setSent((all) => all.filter((l) => l.id !== id)),
		},
		state: {
			opens: { hidden: false, withdraw: null, ...fixture.opens },
			received: fixture.received ?? [],
			sent,
			status,
		},
	};
	return (
		<LettersHubProvider value={value}>
			<LettersScreen />
		</LettersHubProvider>
	);
}
