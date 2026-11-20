import { useState } from "react";
import {
	fixtureYou,
	type YouFixture,
} from "@/features/you/home/dev/fixture-state";
import { YouProvider } from "@/features/you/home/you-data";
import { YouScreen } from "@/features/you/home/you-screen";
import { YouUiProvider, type YouUiStart } from "@/features/you/home/you-ui";

export function FixtureYou({
	fixture,
	start,
}: {
	fixture?: YouFixture;
	start?: YouUiStart;
}) {
	const [earlier, setEarlier] = useState(fixture?.earlierWeek ?? false);
	const value = fixtureYou({ ...fixture, earlierWeek: earlier });
	const you = {
		...value,
		actions: { ...value.actions, pageWeek: (by: -1 | 1) => setEarlier(by < 0) },
	};
	return (
		<YouProvider value={you}>
			<YouUiProvider start={start}>
				<YouScreen />
			</YouUiProvider>
		</YouProvider>
	);
}
