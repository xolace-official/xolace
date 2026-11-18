import { ScrollView } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/care/help/copy";
import { CountryLine } from "@/features/care/help/country/country-line";
import { Disclaimer } from "@/features/care/help/disclaimer/disclaimer";
import { EmergencyCard } from "@/features/care/help/emergency/emergency-card";
import { useHelpScreen } from "@/features/care/help/help-data";
import { LineRow } from "@/features/care/help/lines/line-row";

/**
 * Get help now: the emergency number first and largest, then the chosen country's lines. No
 * mascot, no face, no upsell (a crisis screen stays plain). The native large title comes from
 * the route's layout and folds on scroll, so the scroll view is the screen's first descendant.
 */
export function HelpScreen() {
	const { state } = useHelpScreen();
	return (
		<ScrollView
			className="bg-background"
			contentContainerClassName="gap-3 px-4 pt-1 pb-10"
			contentInsetAdjustmentBehavior="automatic"
		>
			<AppText className="px-1" color="muted" variant="body">
				{COPY.sub}
			</AppText>
			<EmergencyCard />
			<CountryLine />
			{state.view.lines.map((line, i) => (
				<LineRow index={i} key={`${state.choice}-${line.key}`} line={line} />
			))}
			<Disclaimer />
		</ScrollView>
	);
}
