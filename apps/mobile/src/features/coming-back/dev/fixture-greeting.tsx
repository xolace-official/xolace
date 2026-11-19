/** The greeting on fixtures: a tap on a row plays its tick here; Close does nothing. */
import { useEffect, useState } from "react";
import type {
	GreetMode,
	Items,
	Outcomes,
	Row,
} from "@/features/coming-back/coming-back-model";
import { NO_OUTCOMES } from "@/features/coming-back/coming-back-model";
import type { Away } from "@/features/coming-back/copy";
import {
	FIXTURE_NAME,
	fixtureItems,
} from "@/features/coming-back/dev/fixtures";
import { WelcomeBackProvider } from "@/features/coming-back/welcome-back-data";
import { WelcomeBackScreen } from "@/features/coming-back/welcome-back-screen";

/** Long enough for the sheet to settle before a held tick plays. */
const TICK_AFTER_MS = 600;
const noop = () => undefined;

type Props = {
	away?: Away;
	mode?: GreetMode;
	items?: Items;
	outcomes?: Outcomes;
	page?: "list" | "prompt";
	/** Off: the card holds at rest (no rise, no settle tap). */
	enter?: boolean;
	/** A row that ticks just after it opens, to the outcome given. */
	tick?: Row;
};

export function FixtureGreeting({
	away = "recent",
	mode = "greet",
	items = fixtureItems(),
	outcomes = NO_OUTCOMES,
	page = "list",
	enter = false,
	tick,
}: Props) {
	const [ticked, setTicked] = useState(false);
	useEffect(() => {
		if (!tick) {
			return;
		}
		const id = setTimeout(() => setTicked(true), TICK_AFTER_MS);
		return () => clearTimeout(id);
	}, [tick]);
	// Before the tick lands, the row still waits.
	let shown = outcomes;
	if (tick && !ticked) {
		shown =
			tick === "ck"
				? { ...outcomes, ckDone: false }
				: { ...outcomes, prompt: "waiting" };
	}
	return (
		<WelcomeBackProvider
			value={{
				actions: {
					article: noop,
					back: noop,
					closed: noop,
					landDeferred: noop,
					openCheckIn: noop,
					openPrompt: noop,
					pass: noop,
					write: noop,
				},
				state: {
					away,
					ciOpen: false,
					enter,
					items,
					just: ticked ? (tick ?? null) : null,
					mode,
					name: FIXTURE_NAME,
					outcomes: shown,
					page,
					reduced: false,
					tickKey: ticked ? 1 : 0,
				},
			}}
		>
			<WelcomeBackScreen />
		</WelcomeBackProvider>
	);
}
