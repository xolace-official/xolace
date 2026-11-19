import { useState } from "react";
import { ScrollView } from "react-native";
import { STATUS_OPEN } from "../../dev/fixtures";
import type { LettersStatus } from "../../letters-model";
import { LettersCard } from "../connect-card";
import { type ConnectCard, ConnectCardProvider } from "../connect-card-data";

const ignore = () => undefined;

/**
 * The Letters card on fixtures, where Connect draws it: under the large title, above the segment.
 * The offer plays out here (Yes or Not now folds it away); nothing reaches the letters data module.
 * A waiting letter takes a new id on each visit, so it arrives every time.
 */
export function CardFixtureScreen({
	status: initial,
}: {
	status: Partial<LettersStatus>;
}) {
	const [arrival] = useState(() => `arrival-${Math.random()}`);
	const [status, setStatus] = useState<LettersStatus>({
		...STATUS_OPEN,
		...initial,
		unopenedId: initial.unopenedId ? arrival : null,
	});
	const value: ConnectCard = {
		actions: {
			answerOffer: (optIn) => setStatus({ ...status, optIn }),
			openLetter: ignore,
			openLetters: ignore,
			openWrite: ignore,
		},
		state: { status },
	};
	return (
		<ScrollView
			className="bg-background"
			contentContainerClassName="px-4 pt-2"
			contentInsetAdjustmentBehavior="automatic"
		>
			<ConnectCardProvider value={value}>
				<LettersCard />
			</ConnectCardProvider>
		</ScrollView>
	);
}
