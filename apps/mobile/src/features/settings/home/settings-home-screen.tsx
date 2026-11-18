import { ScrollView, View } from "react-native";
import { OpenRow } from "@/components/settings-kit/open-row";
import { SectionTitle } from "@/components/settings-kit/parts";
import { AppText } from "@/components/shared/app-text";
import { HOME_COPY as C, HOME_ICONS as I } from "@/features/settings/home/copy";
import { PlusCard } from "@/features/settings/home/plus/plus-card";
import { useSettingsHomeScreen } from "@/features/settings/home/settings-home-data";

/** Open rows sit on the page, so their titles line up with the 20 pt row padding. */
const ROW_INSET = 20;
const TITLE_GAP = 12;

/**
 * Settings (board "Settings v2", P/design/handoff/settings.md): production's open rows and
 * wording, an accent tile behind each icon, hairlines from the label, and one Plus card.
 * Nothing animates in.
 */
export function SettingsHomeScreen() {
	const { state, actions } = useSettingsHomeScreen();
	return (
		<ScrollView
			className="bg-background"
			contentContainerClassName="pt-1 pb-7.5"
			contentInsetAdjustmentBehavior="automatic"
		>
			<PlusCard card={state.plus} onPress={actions.openPlus} />
			<View className="mb-8">
				<SectionTitle inset={ROW_INSET} pb={TITLE_GAP}>
					{C.preferences}
				</SectionTitle>
				<OpenRow
					icon={I.appearance}
					label={C.rows.appearance}
					onPress={() => actions.open("appearance")}
					value={state.mode}
				/>
				<OpenRow
					icon={I.mirror}
					label={C.rows.mirror}
					onPress={() => actions.open("mirror")}
					value={state.tone}
				/>
				<OpenRow
					icon={I.notifications}
					label={C.rows.notifications}
					last
					onPress={() => actions.open("notifications")}
					value={state.notifications}
				/>
			</View>
			<View className="mb-8">
				<SectionTitle inset={ROW_INSET} pb={TITLE_GAP}>
					{C.personal}
				</SectionTitle>
				<OpenRow
					icon={I.privacy}
					label={C.rows.privacy}
					onPress={() => actions.open("data")}
				/>
				<OpenRow
					icon={I.account}
					label={C.rows.account}
					onPress={() => actions.open("account")}
					value={state.signIn}
				/>
				<OpenRow
					icon={I.follow}
					label={C.rows.follow}
					onPress={() => actions.open("follow")}
				/>
				<OpenRow
					chevron={false}
					icon={I.updates}
					label={state.update.label}
					last
					onPress={actions.checkForUpdates}
					value={state.update.value || undefined}
				/>
			</View>
			<View className="items-center gap-1 pt-0.5 pb-2">
				<AppText
					className="text-[14px] text-foreground/22 leading-[18px] tracking-[1.4px]"
					selectable
					variant="body"
					weight="semibold"
				>
					{C.brand}
				</AppText>
				<AppText
					className="text-[12px] text-foreground/22 leading-4"
					selectable
					variant="body"
				>
					{state.version}
				</AppText>
			</View>
		</ScrollView>
	);
}
