import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { BlurView } from "@/components/shared/styled";
import { NOTIFY_ICONS } from "@/features/settings/notifications/copy";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";

const PICTURE_SCALE = 1;

export function Pill({
	text,
	moon,
	place,
}: {
	text: string;
	moon: boolean;
	place: "over-bubble" | "alone";
}) {
	const [white] = useTokenColors(["on-art"]);
	return (
		<View
			className={cn(
				"absolute h-7.5 self-center overflow-hidden rounded-full",
				place === "over-bubble" ? "-top-2" : "top-29"
			)}
		>
			<BlurView
				className="flex-1 flex-row items-center gap-1.5 bg-notify-pill px-3.25"
				intensity={20}
				tint="dark"
			>
				{moon ? (
					<Icon color={white} name={NOTIFY_ICONS.moon} size={12} />
				) : null}
				<AppText
					className="text-[13px] text-on-art leading-[17px]"
					maxFontSizeMultiplier={PICTURE_SCALE}
					variant="body"
					weight="semibold"
				>
					{text}
				</AppText>
			</BlurView>
		</View>
	);
}
