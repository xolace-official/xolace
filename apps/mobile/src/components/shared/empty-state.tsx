import { useIsFocused } from "expo-router/react-navigation";
import { View } from "react-native";
import { PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { EaseView, FADE_IN } from "@/design/ease";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { AppText } from "./app-text";
import { PressScale } from "./press-scale";

const FACE = 64;

type Props = {
	title: string;
	body: string;
	face?: boolean;
	action?: { label: string; onPress: () => void };
	className?: string;
};

export function EmptyState({ title, body, face, action, className }: Props) {
	return (
		<EaseView {...FADE_IN} className={cn("items-center px-10", className)}>
			{face ? <WaitingFace /> : null}
			<AppText accessibilityRole="header" center variant="headline">
				{title}
			</AppText>
			<AppText
				center
				className="mt-1.5 max-w-75 text-[15px] leading-[21px]"
				color="muted"
				variant="callout"
			>
				{body}
			</AppText>
			{action ? (
				<PressScale
					accessibilityRole="button"
					className="mt-4 h-10 justify-center rounded-[20px] bg-accent-wash px-4.5"
					haptic={playSoftPress}
					onPress={action.onPress}
				>
					<AppText color="accentInk" variant="callout" weight="semibold">
						{action.label}
					</AppText>
				</PressScale>
			) : null}
		</EaseView>
	);
}

function WaitingFace() {
	const focused = useIsFocused();
	const face = useFace(PRESETS.waiting, focused);
	return (
		<View
			accessibilityElementsHidden
			className="mb-3.5"
			importantForAccessibility="no-hide-descendants"
		>
			<XolaceFace face={face} size={FACE} />
		</View>
	);
}
