/** The check-in on fixtures: a pick plays its step; nothing is saved and nothing closes. */
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckInScreen } from "@/features/coming-back/check-in/check-in-screen";
import { CheckInProvider } from "@/features/coming-back/check-in-data";
import { isCareful, picksFor } from "@/features/coming-back/coming-back-model";
import type { Answer, CheckInTier } from "@/features/coming-back/copy";
import { fixtureCard } from "@/features/coming-back/dev/fixtures";

const noop = () => undefined;
const NOD = "12 days of showing up. It counts.";
/** iOS page sheet: 10 pt under the status bar. */
const SHEET_GAP = 10;

export function FixtureCheckIn({
	tier = "standard",
	escalation = false,
	picked: initial = null,
}: {
	tier?: CheckInTier;
	/** A card from an escalation: careful, like acute, with all four answers. */
	escalation?: boolean;
	/** Open on an answer (its step up). */
	picked?: Answer | null;
}) {
	const [picked, setPicked] = useState<Answer | null>(initial);
	const [note, setNote] = useState("");
	const [share, setShare] = useState(false);
	const card = { ...fixtureCard(tier), escalationDerived: escalation };
	const careful = isCareful(card);
	const insets = useSafeAreaInsets();
	// The real route is a page sheet; a dev state is pushed, so it draws the sheet's frame itself.
	return (
		<View
			className="flex-1 bg-scrim"
			style={{ paddingTop: insets.top + SHEET_GAP }}
		>
			<View className="flex-1 overflow-hidden rounded-t-[38px] bg-background">
				<CheckInProvider
					value={{
						actions: {
							close: noop,
							done: noop,
							go: noop,
							leaving: noop,
							pick: (a) => setPicked((p) => p ?? a),
							resources: noop,
							setNote,
							setShare,
							vent: noop,
						},
						state: {
							card,
							careful,
							nod: NOD,
							note,
							picked,
							picks: picksFor(tier),
							question: card.cardText,
							reduced: false,
							saving: false,
							share: careful ? false : share,
						},
					}}
				>
					<CheckInScreen />
				</CheckInProvider>
			</View>
		</View>
	);
}
