import { View } from "react-native";
import {
	Footnote,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import { AppText } from "@/components/shared/app-text";
import {
	FOLLOW_COPY as C,
	FOLLOW_ICONS as I,
} from "@/features/settings/follow/copy";
import { useFollowScreen } from "@/features/settings/follow/follow-data";
import { outside, reviewRow } from "@/features/settings/follow/follow-model";
import { a11yHidden } from "@/lib/utils";

const NOTE = "text-foreground/52";

export function SupportSections() {
	const { actions } = useFollowScreen();
	const review = reviewRow(process.env.EXPO_OS);
	return (
		<>
			<View>
				<SectionTitle>{C.support}</SectionTitle>
				<SettingsCard>
					<TileRow
						icon={I.feedback}
						label={C.sendFeedback}
						onPress={actions.openFeedback}
					/>
					<TileRow
						a11y={outside(`${C.emailUs}, ${C.email}`)}
						icon={I.email}
						label={C.emailUs}
						onPress={actions.emailUs}
						shrinkValue
						trail="out"
						value={C.email}
					/>
					<TileRow
						icon={I.help}
						label={C.getHelp}
						last
						onPress={actions.getHelp}
					/>
				</SettingsCard>
				<Footnote className={NOTE}>{C.supportNote}</Footnote>
			</View>
			<View className="mt-7">
				<SectionTitle>{C.helping}</SectionTitle>
				<SettingsCard>
					<TileRow
						a11y={review.a11y}
						label={C.review}
						last
						mark={
							<AppText
								{...a11yHidden(true)}
								className="text-[17px] leading-5"
								variant="body"
							>
								{C.gift}
							</AppText>
						}
						onPress={actions.review}
						sub={review.sub}
						trail="out"
					/>
				</SettingsCard>
				<Footnote className={NOTE}>{C.reviewNote}</Footnote>
			</View>
		</>
	);
}
