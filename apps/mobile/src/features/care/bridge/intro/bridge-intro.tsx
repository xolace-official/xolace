import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { Icon } from "@/components/shared/icon";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";
import { COPY } from "@/features/care/bridge/copy";
import { IntroMascot } from "@/features/care/bridge/intro/intro-mascot";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const ROW_GLYPH = 18;

/** The first time only: what Trusted Bridge does, and what it never keeps. */
export function BridgeIntro() {
	const { actions } = useBridgeScreen();
	const accentInk = useTokenColor("accent-ink");
	return (
		<View className="flex-1">
			<ScrollView
				className="flex-1"
				contentContainerClassName="gap-7 px-6 pt-6 pb-4"
				showsVerticalScrollIndicator={false}
			>
				<IntroMascot />
				<View className="gap-3">
					<AppText accessibilityRole="header" variant="title">
						{COPY.intro.title}
					</AppText>
					<AppText color="muted" variant="callout">
						{COPY.intro.body}
					</AppText>
				</View>
				<View className="gap-4">
					{COPY.intro.privacy.map((row) => (
						<View
							accessible
							className="flex-row items-center gap-4"
							key={row.title}
						>
							<View className="size-10 items-center justify-center rounded-row bg-accent-wash">
								<Icon color={accentInk} name={row.icon} size={ROW_GLYPH} />
							</View>
							<View className="flex-1 gap-0.5">
								<AppText variant="subhead" weight="semibold">
									{row.title}
								</AppText>
								<AppText color="muted" variant="footnote">
									{row.sub}
								</AppText>
							</View>
						</View>
					))}
				</View>
			</ScrollView>
			<View className="px-4 pt-3 pb-safe-or-4">
				<CtaButton
					haptic={playSoftPress}
					label={COPY.intro.begin}
					onPress={actions.begin}
				/>
			</View>
		</View>
	);
}
