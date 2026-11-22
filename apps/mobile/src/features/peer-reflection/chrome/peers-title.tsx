import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GleamTitle } from "@/components/shared/gleam-title";
import { REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import { EASE } from "../peers-ease";
import { LAYOUT, MOTION, T } from "../peers-look";

const L = LAYOUT.title;

type Props = {
	rows: readonly string[];
	sub: string;
	arrive: SharedValue<number>;
	reduced: boolean;
};

export function PeersTitle({ rows, sub, arrive, reduced }: Props) {
	const subStyle = useAnimatedStyle(() => {
		const e = arrive.get() - T.title - (reduced ? 0 : MOTION.subDelay);
		return {
			opacity: reduced
				? clamp01(e / REDUCED_FADE_MS)
				: EASE.css(clamp01(e / MOTION.subMs)),
		};
	});
	return (
		<View style={{ marginTop: L.top }}>
			<View style={{ marginHorizontal: L.side }}>
				<GleamTitle
					at={T.title}
					clock={arrive}
					line={L.line}
					reduced={reduced}
					rows={rows}
					size={L.size}
					step={T.tStep}
					tracking={L.tracking}
				/>
			</View>
			{sub ? (
				<Animated.View
					style={[
						{ marginHorizontal: LAYOUT.sub.side, marginTop: LAYOUT.sub.top },
						subStyle,
					]}
				>
					<AppText
						center
						color="muted"
						style={{ fontSize: LAYOUT.sub.size, lineHeight: LAYOUT.sub.line }}
						variant="callout"
					>
						{sub}
					</AppText>
				</Animated.View>
			) : null}
		</View>
	);
}
