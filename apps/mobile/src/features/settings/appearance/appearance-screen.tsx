import type { ReactNode, Ref } from "react";
import { ScrollView, type ScrollViewInstance, View } from "react-native";
import { Footnote, SectionTitle } from "@/components/settings-kit/parts";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import { MotionCard } from "@/features/settings/appearance/choices/motion-card";
import { ReplayCard } from "@/features/settings/appearance/choices/replay-card";
import {
	NightCard,
	ProfileCardsCard,
} from "@/features/settings/appearance/choices/switch-cards";
import { APPEARANCE_COPY as C } from "@/features/settings/appearance/copy";
import { ModePicker } from "@/features/settings/appearance/mode/mode-picker";
import { ThemeStrip } from "@/features/settings/appearance/theme/theme-strip";

function Section({
	title,
	note,
	children,
}: {
	title: string;
	note?: string;
	children: ReactNode;
}) {
	return (
		<View>
			<SectionTitle>{title}</SectionTitle>
			{children}
			{note ? <Footnote>{note}</Footnote> : null}
		</View>
	);
}

/**
 * Settings › Appearance (board "Appearance v2", P/design/handoff/settings.md): Mode and Theme as
 * pictures, the rest as grouped cards with footnotes. Opens instantly; nothing animates in.
 */
export function AppearanceScreen({ ref }: { ref?: Ref<ScrollViewInstance> }) {
	const { state } = useAppearanceScreen();
	return (
		<ScrollView
			className="bg-background"
			contentContainerClassName="gap-7.5 pt-1 pb-10"
			contentInsetAdjustmentBehavior="automatic"
			ref={ref}
		>
			<Section note={state.modeNote} title={C.mode}>
				<ModePicker />
			</Section>
			<Section note={state.themeNote} title={C.theme}>
				<ThemeStrip />
			</Section>
			<Section note={state.motionNote} title={C.motion}>
				<MotionCard />
			</Section>
			<Section note={C.nightNote} title={C.night}>
				<NightCard />
			</Section>
			<Section note={C.profileNote} title={C.profile}>
				<ProfileCardsCard />
			</Section>
			<Section title={C.general}>
				<ReplayCard />
			</Section>
		</ScrollView>
	);
}
