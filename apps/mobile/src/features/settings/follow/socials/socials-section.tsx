import { View } from "react-native";
import { SectionTitle, SettingsCard } from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import { FOLLOW_COPY as C, SOCIAL } from "@/features/settings/follow/copy";
import { useFollowScreen } from "@/features/settings/follow/follow-data";
import { outside } from "@/features/settings/follow/follow-model";
import { SocialMark } from "@/features/settings/follow/socials/social-mark";

export function SocialsSection() {
	const { actions } = useFollowScreen();
	return (
		<View className="mt-7">
			<SectionTitle>{C.follow}</SectionTitle>
			<SettingsCard>
				{SOCIAL.map((s, i) => (
					<TileRow
						a11y={outside(`${s.label}, ${s.handle}`)}
						key={s.id}
						label={s.label}
						last={i === SOCIAL.length - 1}
						mark={<SocialMark id={s.id} />}
						onPress={() => actions.openSocial(s.id)}
						trail="out"
						value={s.handle}
					/>
				))}
			</SettingsCard>
		</View>
	);
}
