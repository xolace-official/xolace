import { Stack } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { useFixedFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { playSoftPress } from "@/lib/haptics";
import { WHATS_NEW_COPY as C } from "../copy";
import { useWhatsNewScreen } from "../whats-new-data";
import { WhatsNewIcon } from "./whats-new-icon";

const TOP = 17;
const BOTTOM = 34;

export function WhatsNewScreen() {
	const { state, actions } = useWhatsNewScreen();
	const insets = useSafeAreaInsets();
	const scheme = useScheme();
	const faces = useFixedFaces("mirror");

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingBottom: Math.max(insets.bottom, BOTTOM),
				paddingTop: insets.top + TOP,
			}}
		>
			<Stack.Screen
				options={{ statusBarStyle: scheme === "dark" ? "light" : "dark" }}
			/>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pb-6"
				showsVerticalScrollIndicator={false}
			>
				<AppText
					className="tracking-[0.4px]"
					color="emberInk"
					variant="footnote"
					weight="semibold"
				>
					{C.eyebrow}
				</AppText>
				<AppText
					accessibilityRole="header"
					className="mt-2 text-[36px] leading-[40px] tracking-[-0.6px]"
					variant="title"
				>
					{C.title}
				</AppText>
				<AppText
					className={
						faces
							? "mt-2.5 font-mirror text-[19px] leading-[26px]"
							: "mt-2.5 text-[19px] leading-[26px]"
					}
					color="muted"
					variant="body"
				>
					{C.lede}
				</AppText>
				<View className="mt-10 gap-[26px]">
					{state.entry.highlights.map((item) => (
						<View
							accessibilityLabel={`${item.title}. ${item.body}`}
							accessible
							className="flex-row items-start gap-4"
							key={item.title}
						>
							<WhatsNewIcon icon={item.icon} tone={item.tone} />
							<View className="flex-1 gap-[3px]">
								<AppText
									className="leading-[22px]"
									variant="body"
									weight="semibold"
								>
									{item.title}
								</AppText>
								<AppText
									className="leading-[21px]"
									color="muted"
									variant="callout"
								>
									{item.body}
								</AppText>
							</View>
						</View>
					))}
				</View>
			</ScrollView>
			<GlassButton
				accessibilityLabel={C.continue}
				className="mx-6 h-14 items-center justify-center rounded-full"
				fill="accent"
				haptic={playSoftPress}
				onPress={actions.continue}
			>
				<AppText color="accentForeground" variant="body" weight="semibold">
					{C.continue}
				</AppText>
			</GlassButton>
		</View>
	);
}
