import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import type { MilestoneAdded } from "@/features/achievements/arrival/arrival-model";
import {
	age,
	type Eng,
	type Geo,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { useSlideUp } from "@/features/achievements/arrival/milestone/week";
import { COPY } from "@/features/achievements/copy";
import { fs } from "@/features/achievements/motion-math";
import { useTokenColor } from "@/lib/use-token-color";

const CARD_TOP = 652;
const ICON_SIZE = 19;
const ICON: Record<MilestoneAdded, IconName> = {
	freeze: { android: "ac_unit", ios: "snowflake" },
	saver: { android: "local_fire_department", ios: "flame.fill" },
};
const TOKEN = { from: 0.5, turn: -40, w: 13, z: 0.5 } as const;

/** What the milestone day put in hand: a streak saver (ember) or a freeze (frost). */
export function AddedCard({
	eng,
	geo,
	dark,
	added,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	dark: boolean;
	added: MilestoneAdded;
}) {
	const separator = useTokenColor("separator");
	const frost = useTokenColor("frost");
	const frostWash = useTokenColor(
		dark ? "arrival-frost-wash-dusk" : "arrival-frost-wash-day"
	);
	const ember = useTokenColor("ember-ink");
	const emberWash = useTokenColor("ember-wash");
	const saver = added === "saver";
	const style = useSlideUp(eng, T.freeze);
	const token = useAnimatedStyle(() => {
		const e = eng.get();
		const p = e.rm ? 1 : fs((age(e, e.tm) - T.token) / 1000, TOKEN.w, TOKEN.z);
		return {
			transform: [
				{ scale: TOKEN.from + (1 - TOKEN.from) * p },
				{ rotate: `${(1 - p) * TOKEN.turn}deg` },
			],
		};
	});
	const words = COPY.milestone[added];
	return (
		<Animated.View
			className="absolute inset-x-5 flex-row items-center gap-3 rounded-[22px] bg-surface px-3.5 py-3"
			pointerEvents="none"
			style={[
				{
					boxShadow: `0px 0px 0px 0.5px ${separator}`,
					top: CARD_TOP + geo.dy,
				},
				style,
			]}
		>
			<Animated.View
				className="size-10 items-center justify-center rounded-full"
				style={[{ backgroundColor: saver ? emberWash : frostWash }, token]}
			>
				<Icon
					color={saver ? ember : frost}
					name={ICON[added]}
					size={ICON_SIZE}
					weight="medium"
				/>
			</Animated.View>
			<View className="min-w-0 flex-1 gap-0.5">
				<AppText
					className="text-[15px] leading-5"
					variant="body"
					weight="semibold"
				>
					{words.title}
				</AppText>
				<AppText
					className="text-[12.5px] leading-[17px]"
					color="muted"
					variant="body"
				>
					{words.line}
				</AppText>
			</View>
		</Animated.View>
	);
}
