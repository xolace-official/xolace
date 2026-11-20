import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { EaseView, type TimingTransition } from "@/design/ease";
import { HOME } from "@/features/explore/copy";
import {
	HOME_CURVES,
	HOME_S,
	HOME_TIMING,
} from "@/features/explore/explore-style";
import { useHome } from "@/features/explore/home/home-data";
import {
	type HomeItem,
	isLocked,
	pickAt,
} from "@/features/explore/home/home-model";
import { cn } from "@/lib/cn";
import { ItemRow } from "./home-item";

export function ChooseForMe({ pool }: { pool: readonly HomeItem[] }) {
	const { state, actions } = useHome();
	const [picked, setPicked] = useState(state.startPicked ?? false);
	const [turn, setTurn] = useState(0);
	const [dim, setDim] = useState(false);
	const swap = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (swap.current) {
				clearTimeout(swap.current);
			}
		},
		[]
	);
	const it = pickAt(pool, turn);
	if (!it) {
		return null;
	}

	const another = () => {
		Presets.System.selection();
		if (swap.current) {
			return;
		}
		setDim(true);
		swap.current = setTimeout(() => {
			swap.current = null;
			setDim(false);
			setTurn((t) => t + 1);
		}, HOME_TIMING.anotherMs / 2);
	};
	const go =
		it.kind === "entry"
			? HOME.read
			: isLocked(it, state.locked)
				? HOME.plus
				: HOME.play;

	return (
		<View
			className="gap-3 rounded-card border border-separator bg-surface p-4"
			style={{ marginHorizontal: HOME_S.cardGutter }}
		>
			<AppText className="leading-[21px]" color="muted" variant="callout">
				{HOME.pickQ}
			</AppText>
			{picked ? (
				<EaseView
					accessibilityLiveRegion="polite"
					animate={{ opacity: dim ? 0 : 1 }}
					className="-mx-4"
					transition={dim ? HALF_OUT : HALF_IN}
				>
					<ItemRow from="explore-pick" it={it} slot="pick" />
				</EaseView>
			) : null}
			<View className="flex-row gap-2">
				{picked ? (
					<PickButton
						label={go}
						onPress={() => actions.open(it, "explore-pick")}
						primary
					/>
				) : null}
				<PickButton
					label={picked ? HOME.another : HOME.pickGo}
					onPress={() => {
						if (picked) {
							another();
							return;
						}
						Presets.System.selection();
						setPicked(true);
					}}
					primary={!picked}
				/>
			</View>
		</View>
	);
}

const HALF_OUT: TimingTransition = {
	duration: HOME_TIMING.anotherMs / 2,
	easing: HOME_CURVES.sineOut,
	type: "timing",
};
const HALF_IN: TimingTransition = {
	duration: HOME_TIMING.anotherMs / 2,
	easing: HOME_CURVES.sineIn,
	type: "timing",
};

function PickButton({
	label,
	primary,
	onPress,
}: {
	label: string;
	primary: boolean;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={label}
			className={cn(
				"h-10.5 items-center justify-center rounded-[21px] px-4.5",
				primary ? "bg-accent" : "bg-surface-secondary"
			)}
			onPress={onPress}
		>
			<AppText
				color={primary ? "accentForeground" : "foreground"}
				variant="callout"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}
