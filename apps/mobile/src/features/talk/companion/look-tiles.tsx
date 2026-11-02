// The companion's looks as a row of small live faces; the chosen one is ringed.

import type { TalkLook } from "@xolace/backend/convex/lib/voices";
import { PressableFeedback } from "heroui-native";
import { ScrollView } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { NEUTRAL } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { LOOK_ORDER, LOOKS } from "./companion-look";

const TILE_FACE = 52;

type Props = {
	value: TalkLook;
	onChange: (look: TalkLook) => void;
	/** `false` stops the faces' clocks while the sheet is closed. */
	running: boolean;
};

export function LookTiles({ value, onChange, running }: Props) {
	return (
		<ScrollView
			accessibilityRole="radiogroup"
			contentContainerClassName="gap-1 px-3"
			horizontal
			showsHorizontalScrollIndicator={false}
		>
			{LOOK_ORDER.map((name) => (
				<LookTile
					key={name}
					name={name}
					onPress={() => {
						playSoftPress();
						onChange(name);
					}}
					running={running}
					selected={name === value}
				/>
			))}
		</ScrollView>
	);
}

function LookTile({
	name,
	onPress,
	running,
	selected,
}: {
	name: TalkLook;
	onPress: () => void;
	running: boolean;
	selected: boolean;
}) {
	const face = useFace(NEUTRAL, running);
	const { label, look } = LOOKS[name];
	return (
		<PressableFeedback
			accessibilityLabel={`${label} look`}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			className={cn(
				"items-center gap-1 rounded-2xl border-2 p-2",
				selected ? "border-accent bg-surface" : "border-transparent"
			)}
			onPress={onPress}
			style={{ borderCurve: "continuous" }}
		>
			<XolaceFace {...look} face={face} size={TILE_FACE} />
			<AppText
				className={cn(
					"text-xs",
					selected ? "font-medium text-foreground" : "text-muted"
				)}
			>
				{label}
			</AppText>
		</PressableFeedback>
	);
}
