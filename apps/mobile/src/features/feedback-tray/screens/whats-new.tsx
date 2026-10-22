import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { Dimensions, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { useAppStore } from "@/src/store/store";
import { LATEST_WHATS_NEW_ID, WHATS_NEW } from "../constants/whats-new";

const LIST_MAX_HEIGHT = Dimensions.get("window").height * 0.5;

/**
 * Read-only changelog. Opening it marks the newest entry as seen (clears the
 * menu badge) and records the structural open event — no content captured.
 */
export const WhatsNew = () => {
	const setLastSeenVersion = useAppStore((s) => s.setLastSeenVersion);
	const posthog = usePostHog();
	const accentColor = useThemeColor("accent") as string;

	// Marking-as-seen + analytics is a genuine side effect on open, not state
	// mirroring — an effect is the right tool here.
	useEffect(() => {
		posthog.capture("whats_new_opened");
		if (LATEST_WHATS_NEW_ID) {
			setLastSeenVersion(LATEST_WHATS_NEW_ID);
		}
	}, [posthog, setLastSeenVersion]);

	return (
		<View className="gap-3">
			<AppText className="font-semibold text-foreground text-lg">
				What&apos;s new
			</AppText>

			<ScrollView
				nestedScrollEnabled
				showsVerticalScrollIndicator={false}
				style={{ maxHeight: LIST_MAX_HEIGHT }}
			>
				<View className="gap-5">
					{WHATS_NEW.map((entry, index) => (
						<Animated.View
							className="gap-2.5"
							entering={FadeInDown.delay(index * 50)}
							key={entry.id}
						>
							<View className="flex-row items-center justify-between">
								<AppText className="font-medium text-foreground text-sm">
									{entry.label}
								</AppText>
								<AppText className="text-foreground/40 text-xs">
									{entry.date}
								</AppText>
							</View>

							{entry.highlights.map((highlight) => (
								<View className="flex-row gap-3" key={highlight.title}>
									<SymbolView
										name={highlight.icon}
										size={18}
										tintColor={accentColor}
									/>
									<View className="flex-1">
										<AppText className="text-foreground text-sm">
											{highlight.title}
										</AppText>
										<AppText className="font-light text-foreground/50 text-xs">
											{highlight.body}
										</AppText>
									</View>
								</View>
							))}
						</Animated.View>
					))}
				</View>
			</ScrollView>
		</View>
	);
};
