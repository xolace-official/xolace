import { Pressable, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { SEAT } from "../copy";
import { SEAT_TEXT_MAX } from "../first-run-layout";
import { ease, fs, seg } from "../first-run-motion";
import { css, ink, STORY_COLORS } from "../first-run-palette";
import { AUTH, ageAuth, ageSpin, PROV, type SEng } from "../story/story-scene";
import type { AuthProvider } from "../use-sign-in";
import { AppleIcon } from "./apple-icon";
import { GoogleIcon } from "./google-icon";
import { seatAge, seatedOut } from "./seat-in";

const H = 54;
const PRESSED_MS = 160;
const SPIN_DEG_PER_MS = 0.4;

export function SeatButton({
	eng,
	provider,
	busy,
	disabled,
	onPress,
}: {
	eng: SharedValue<SEng>;
	provider: AuthProvider;
	busy: boolean;
	disabled: boolean;
	onPress: () => void;
}) {
	const apple = provider === "apple";
	const prov = apple ? PROV.apple : PROV.google;
	const at = apple ? 680 : 760;
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const s = seatAge(e);
		const aa = ageAuth(e);
		const inn = (e.rm ? 1 : ease(seg(s, at, at + 420))) * (1 - seatedOut(e));
		const other = aa >= 0 && e.authProv !== prov;
		const pressed = aa >= 0 && !other && ageSpin(e) < PRESSED_MS;
		return {
			opacity: inn * (other ? 0.45 : 1),
			transform: [
				{ translateY: e.rm ? 0 : 16 * (1 - fs((s - at) / 1000, 10, 0.8)) },
				{ scale: pressed ? 0.97 : 1 },
			],
		};
	});
	const waiting = (e: SEng) => {
		"worklet";
		const aa = ageAuth(e);
		return aa >= 0 && aa < AUTH.back + 50 && e.authProv === prov;
	};
	const label = useAnimatedStyle(() => ({
		opacity: waiting(eng.get()) ? 0 : 1,
	}));
	const spin = useAnimatedStyle(() => {
		const e = eng.get();
		return {
			opacity: waiting(e) ? 1 : 0,
			transform: [
				{ rotate: `${Math.max(0, ageSpin(e)) * SPIN_DEG_PER_MS}deg` },
			],
		};
	});
	const fg = apple ? css(STORY_COLORS.apple.ink) : css(STORY_COLORS.ink);
	const text = apple ? SEAT.apple : SEAT.google;
	return (
		<Animated.View style={style}>
			<Pressable
				accessibilityLabel={text}
				accessibilityRole="button"
				accessibilityState={{ busy, disabled }}
				className={cn(
					"items-center justify-center rounded-full px-5 py-3",
					apple ? "border-0" : "border-[1.5px]"
				)}
				disabled={disabled}
				onPress={onPress}
				style={{
					backgroundColor: apple ? css(STORY_COLORS.apple.fill) : "transparent",
					borderColor: ink(0.2),
					minHeight: H,
				}}
			>
				<Animated.View
					className="flex-row items-center justify-center gap-[9px]"
					style={label}
				>
					{apple ? (
						<AppleIcon color={fg} size={17} />
					) : (
						<GoogleIcon size={16} />
					)}
					<AppText
						className="shrink text-center"
						maxFontSizeMultiplier={SEAT_TEXT_MAX}
						style={{ color: fg, fontSize: 16, lineHeight: 20 }}
						weight="semibold"
					>
						{text}
					</AppText>
				</Animated.View>
				<View className="absolute inset-0 items-center justify-center">
					<Animated.View
						className="size-4.5 rounded-full border-2"
						style={[{ borderColor: fg, borderRightColor: "transparent" }, spin]}
					/>
				</View>
			</Pressable>
		</Animated.View>
	);
}
