import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { FONTS } from "@/design/type";
import { cn } from "@/lib/cn";
import { SEAT } from "../copy";
import { SEAT_TEXT_MAX, SEAT_TITLE_MAX } from "../first-run-layout";
import { ease, seg } from "../first-run-motion";
import { css, ink, STORY_COLORS } from "../first-run-palette";
import { AUTH, ageAuth, type SEng } from "../story/story-scene";
import { seatAge } from "./seat-in";

const SWAP = {
	at: AUTH.seated + 100,
	from: AUTH.seated - 100,
	to: AUTH.seated + 300,
};

function Words({ eng, after }: { eng: SharedValue<SEng>; after: boolean }) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const aa = ageAuth(e);
		const isAfter = aa >= SWAP.at;
		const dip =
			aa >= 0 ? 1 - Math.sin(Math.PI * seg(aa, SWAP.from, SWAP.to)) : 1;
		const inn = e.rm ? 1 : ease(seg(seatAge(e), 520, 950));
		return {
			opacity: (isAfter === after ? 1 : 0) * inn * dip,
			transform: [{ translateY: e.rm ? 0 : 10 * (1 - inn) }],
		};
	});
	return (
		<Animated.View
			className={cn("items-center gap-2", after && "absolute inset-x-0 top-0")}
			style={style}
		>
			<AppText
				className="text-center"
				maxFontSizeMultiplier={SEAT_TITLE_MAX}
				style={{
					color: css(STORY_COLORS.ink),
					fontFamily: FONTS.displayBold,
					fontSize: 28,
					letterSpacing: -0.7,
					lineHeight: 34,
				}}
			>
				{after ? SEAT.seatedTitle : SEAT.title}
			</AppText>
			<AppText
				className="text-center"
				maxFontSizeMultiplier={SEAT_TEXT_MAX}
				style={{ color: ink(0.62), fontSize: 15, lineHeight: 22 }}
			>
				{after ? SEAT.seatedSub : SEAT.sub}
			</AppText>
		</Animated.View>
	);
}

export function SeatWords({
	eng,
	seated,
}: {
	eng: SharedValue<SEng>;
	seated: boolean;
}) {
	const title = seated ? SEAT.seatedTitle : SEAT.title;
	const sub = seated ? SEAT.seatedSub : SEAT.sub;
	return (
		<View
			accessibilityLabel={`${title} ${sub}`}
			accessibilityLiveRegion="polite"
			accessibilityRole="header"
			accessible
		>
			<Words after={false} eng={eng} />
			<Words after eng={eng} />
		</View>
	);
}
