import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";
import { useTokenColor } from "@/lib/use-token-color";

type Props = {
	displayName: string;
	firstSessionAt: number | null;
	sessionCount: number;
	avatarUrl?: string | null;
	avatarKey?: string | null;
	avatarLabel?: string;
	onAvatarPress?: () => void;
};

function getGreeting(name: string): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) {
		return `Morning, ${name}`;
	}
	if (hour >= 12 && hour < 17) {
		return `Afternoon, ${name}`;
	}
	if (hour >= 17 && hour < 21) {
		return `Evening, ${name}`;
	}
	return `Quiet hours, ${name}`;
}

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function formatSinceDate(ts: number): string {
	const d = new Date(ts);
	const now = new Date();
	const month = MONTHS[d.getMonth()];
	return d.getFullYear() === now.getFullYear()
		? `By the fire since ${month}`
		: `By the fire since ${month} ${d.getFullYear()}`;
}

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const INITIAL = { opacity: 0, translateY: 8 };
const ANIMATE = { opacity: 1, translateY: 0 };
const TRANSITION = { duration: 320, easing: EASE, type: "timing" as const };

const styles = StyleSheet.create({
	avatarImage: {
		height: 80,
		width: 80,
	},
});

export function ProfileHero({
	displayName,
	firstSessionAt,
	sessionCount,
	avatarUrl,
	avatarKey,
	avatarLabel,
	onAvatarPress,
}: Props) {
	const emberColor = useTokenColor("ember");
	const accentColor = useTokenColor("accent");
	const accentForeground = useTokenColor("accent-foreground");

	return (
		<View className="items-center px-6">
			<EaseView
				animate={{ opacity: 1, scale: 1 }}
				initialAnimate={{ opacity: 0, scale: 0.92 }}
				transition={TRANSITION}
			>
				<PressableFeedback
					accessibilityLabel={
						avatarLabel
							? `Change avatar, current: ${avatarLabel}`
							: "Change avatar"
					}
					accessibilityRole="button"
					isDisabled={!onAvatarPress}
					onPress={onAvatarPress}
				>
					<View
						className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[1.5px]"
						style={{
							backgroundColor: emberColor + "26",
							borderColor: emberColor + "55",
						}}
					>
						{avatarUrl ? (
							<Image
								cachePolicy="memory-disk"
								contentFit="cover"
								recyclingKey={avatarKey ?? avatarUrl}
								source={{ uri: avatarUrl }}
								style={styles.avatarImage}
								transition={150}
							/>
						) : (
							<SymbolView
								name={{
									android: "local_fire_department",
									ios: "flame.fill",
									web: "local_fire_department",
								}}
								size={34}
								tintColor={emberColor}
							/>
						)}
					</View>

					{/* Small edit affordance — only when the picker is wired up. */}
					{onAvatarPress && (
						<View
							className="absolute right-0 bottom-0 h-6 w-6 items-center justify-center rounded-full border-2 border-background"
							style={{ backgroundColor: accentColor }}
						>
							<SymbolView
								name={{ android: "edit", ios: "pencil", web: "edit" }}
								size={11}
								tintColor={accentForeground}
							/>
						</View>
					)}
				</PressableFeedback>
			</EaseView>

			<EaseView
				animate={ANIMATE}
				className="mt-4 items-center gap-1.5"
				initialAnimate={INITIAL}
				transition={{ ...TRANSITION, delay: 80 }}
			>
				<AppText className="text-center font-bold text-[27px] text-foreground tracking-tight">
					{getGreeting(displayName)}
				</AppText>

				{sessionCount > 0 && firstSessionAt !== null && (
					<AppText className="text-[15px] text-muted">
						{formatSinceDate(firstSessionAt)}
					</AppText>
				)}

				{sessionCount === 0 && (
					<AppText className="mt-1 px-6 text-center text-[15px] text-muted leading-6">
						This is your space. It fills in as you show up.
					</AppText>
				)}
			</EaseView>
		</View>
	);
}
