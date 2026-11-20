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

/** The face's size where it fits: big enough to read its pose, small enough to stay quiet. */
const FACE = 64;

type Props = {
	title: string;
	/** One line, two at most: what's missing and, if anything, what fills it. */
	body: string;
	/** A whole screen or a tall section with nothing in it: the face waits there, softly lidded. */
	face?: boolean;
	/** One quiet way on, only when there's an obvious one. */
	action?: { label: string; onPress: () => void };
	className?: string;
};

/**
 * The app's one empty state (C2): a headline and one body line, centred, and the face in its
 * waiting pose where there's room for it. No illustrations, no exclamation, no blame: an empty
 * list is a resting place, not an error. It fades in (200 ms) so a list that empties doesn't snap.
 * An empty screen centres it in its space (the caller's `flex-1 justify-center`); an emptied
 * filter or search puts it 40 pt under the control (`pt-10`), with no face.
 */
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

/** The face, waiting: calm and softly lidded, blinking now and then, still while the screen is away. */
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
