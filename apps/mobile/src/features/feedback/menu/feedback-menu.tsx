import { View } from "react-native";
import { TileRow } from "@/components/settings-kit/tile-row";
import { AppText } from "@/components/shared/app-text";
import type { IconName } from "@/components/shared/icon";
import { FEEDBACK_COPY } from "../copy";
import { useFeedbackScreen } from "../feedback-data";

const M = FEEDBACK_COPY.menu;
const BUG: IconName = { android: "bug_report", ios: "ant.fill" };
const IDEA: IconName = { android: "lightbulb", ios: "lightbulb.fill" };
const NEW: IconName = { android: "auto_awesome", ios: "sparkles" };
/** The unseen dot sits on the tile's top-right corner (row padding 16 + tile 30). */
const DOT_LEFT = 41;

/** The shake menu: report a bug, suggest an idea, or what's new, as the settings kit's rows. */
export function FeedbackMenu() {
	const { state, actions } = useFeedbackScreen();
	return (
		<View>
			<AppText accessibilityRole="header" className="mb-2 px-4" variant="title">
				{M.title}
			</AppText>
			<TileRow
				icon={BUG}
				label={M.bug.label}
				onPress={() => actions.openReport("bug")}
				sub={M.bug.hint}
			/>
			<TileRow
				icon={IDEA}
				label={M.idea.label}
				onPress={() => actions.openReport("idea")}
				sub={M.idea.hint}
			/>
			<View>
				<TileRow
					icon={NEW}
					label={M.whatsNew.label}
					last
					onPress={actions.openWhatsNew}
					sub={M.whatsNew.hint}
				/>
				{state.whatsNewUnseen ? (
					<View
						className="absolute top-1/2 size-2 -translate-y-4.5 rounded-full bg-accent"
						pointerEvents="none"
						style={{ left: DOT_LEFT }}
					/>
				) : null}
			</View>
		</View>
	);
}
