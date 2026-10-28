import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useAppStore } from "@/store/store";
import { hasUnseenWhatsNew } from "../constants/whats-new";
import { useTray } from "../engine/tray-provider";
import type { Trays } from "./registry";

type CrossPlatformSymbol = React.ComponentProps<typeof SymbolView>["name"];

type Row = {
	key: "bug" | "idea";
	label: string;
	hint: string;
	icon: CrossPlatformSymbol;
};

const ROWS: Row[] = [
	{
		hint: "Something broke or felt off",
		icon: { android: "bug_report", ios: "ant.fill" },
		key: "bug",
		label: "Report a bug",
	},
	{
		hint: "Something you'd love to see",
		icon: { android: "lightbulb", ios: "lightbulb.fill" },
		key: "idea",
		label: "Suggest an idea",
	},
];

/**
 * Tray root: report a bug, suggest an idea, or see what's new. Each row pushes
 * the matching screen.
 */
export const TrayMenu = () => {
	const { show } = useTray<Trays>();
	const accentColor = useThemeColor("accent") as string;
	const mutedColor = useThemeColor("muted") as string;
	const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
	const showWhatsNewBadge = hasUnseenWhatsNew(lastSeenVersion);

	return (
		<View className="gap-1">
			<AppText className="mb-1 font-semibold text-foreground text-lg">
				How can we help?
			</AppText>

			{ROWS.map((row, index) => (
				<Animated.View entering={FadeInDown.delay(index * 60)} key={row.key}>
					<PressableFeedback
						accessibilityLabel={row.label}
						className="flex-row items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3.5"
						onPress={() => show("report", { kind: row.key })}
					>
						<SymbolView name={row.icon} size={20} tintColor={accentColor} />
						<View className="flex-1">
							<AppText className="text-base text-foreground">
								{row.label}
							</AppText>
							<AppText className="font-light text-foreground/50 text-xs">
								{row.hint}
							</AppText>
						</View>
						<SymbolView
							name={{ android: "chevron_right", ios: "chevron.right" }}
							size={14}
							tintColor={mutedColor}
						/>
					</PressableFeedback>
				</Animated.View>
			))}

			<Animated.View entering={FadeInDown.delay(ROWS.length * 60)}>
				<PressableFeedback
					accessibilityLabel="What's new"
					className="flex-row items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3.5"
					onPress={() => show("whatsNew")}
				>
					<SymbolView
						name={{ android: "auto_awesome", ios: "sparkles" }}
						size={20}
						tintColor={accentColor}
					/>
					<View className="flex-1">
						<View className="flex-row items-center gap-2">
							<AppText className="text-base text-foreground">
								What&apos;s new
							</AppText>
							{showWhatsNewBadge && (
								<View className="h-2 w-2 rounded-full bg-accent" />
							)}
						</View>
						<AppText className="font-light text-foreground/50 text-xs">
							See the latest updates
						</AppText>
					</View>
					<SymbolView
						name={{ android: "chevron_right", ios: "chevron.right" }}
						size={14}
						tintColor={mutedColor}
					/>
				</PressableFeedback>
			</Animated.View>
		</View>
	);
};
