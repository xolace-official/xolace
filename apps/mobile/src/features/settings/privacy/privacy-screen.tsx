import { type ReactNode, useRef } from "react";
import { ScrollView, type ScrollViewInstance, View } from "react-native";
import {
	Footnote,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import { LegalBottomSheet } from "@/components/shared/legal-bottom-sheet";
import { PRIVACY_POLICY } from "@/components/shared/legal-content";
import {
	PRIVACY_COPY as C,
	PRIVACY_ICONS as I,
} from "@/features/settings/privacy/copy";
import { KeepCard } from "@/features/settings/privacy/keep/keep-card";
import { KeepSessions } from "@/features/settings/privacy/keeping/keep-sessions";
import { usePrivacyScreen } from "@/features/settings/privacy/privacy-data";
import {
	keepCard,
	shownRetention,
} from "@/features/settings/privacy/privacy-model";
import { SettingsSwitchRow } from "@/features/settings/settings-switch-row";

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
		<View className="mt-7">
			<SectionTitle>{title}</SectionTitle>
			{children}
			{note ? <Footnote className="text-foreground/52">{note}</Footnote> : null}
		</View>
	);
}

/**
 * Settings › Privacy & Data (board "Privacy & Data v2", P/design/handoff/settings-sections.md):
 * what Xolace keeps, said plainly, then the switches and choices that change it, a copy and the
 * policy, and the two deletes, each asking first in a sheet. Nothing animates in.
 */
export function PrivacyScreen({
	scrolledToEnd = false,
}: {
	/** Opens scrolled to the bottom (a dev state). */
	scrolledToEnd?: boolean;
}) {
	const { state, actions } = usePrivacyScreen();
	const scroll = useRef<ScrollViewInstance>(null);
	const card = keepCard({
		memory: state.memory,
		retention: shownRetention(state.retention, state.pending),
		share: state.share,
	});
	return (
		<>
			<ScrollView
				className="bg-background"
				contentContainerClassName="pt-1 pb-10"
				contentInsetAdjustmentBehavior="automatic"
				onContentSizeChange={() => {
					if (scrolledToEnd) {
						scroll.current?.scrollToEnd({ animated: false });
					}
				}}
				ref={scroll}
			>
				<KeepCard card={card} />
				<Section note={C.memoryNote} title={C.memory}>
					<SettingsCard>
						<SettingsSwitchRow
							label={C.memoryRow}
							onChange={actions.setMemory}
							value={state.memory}
						/>
					</SettingsCard>
				</Section>
				<Section note={C.shareNote} title={C.sharing}>
					<SettingsCard>
						<SettingsSwitchRow
							label={C.shareRow}
							onChange={actions.setShare}
							value={state.share}
						/>
					</SettingsCard>
				</Section>
				<Section note={C.keepNote} title={C.keep}>
					<KeepSessions />
				</Section>
				<Section title={C.yourData}>
					<SettingsCard>
						<TileRow
							a11y={C.outside(`${C.copy}, ${C.copyValue}`)}
							icon={I.copy}
							label={C.copy}
							onPress={actions.openCopy}
							trail="out"
							value={C.copyValue}
						/>
						<TileRow
							icon={I.policy}
							label={C.policy}
							last
							onPress={actions.openPolicy}
						/>
					</SettingsCard>
				</Section>
				<Section note={C.deleteNote} title={C.delete}>
					<SettingsCard>
						<TileRow
							danger
							icon={I.deleteData}
							label={C.deleteData}
							onPress={() => actions.openDelete("data")}
						/>
						<TileRow
							danger
							icon={I.deleteAccount}
							label={C.deleteAccount}
							last
							onPress={() => actions.openDelete("account")}
						/>
					</SettingsCard>
				</Section>
			</ScrollView>
			{/* Production's legal sheet, the policy in full with a link to the web copy. */}
			<LegalBottomSheet
				document={state.policyOpen ? PRIVACY_POLICY : null}
				onClose={actions.closePolicy}
			/>
		</>
	);
}
