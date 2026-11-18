import { Image } from "expo-image";
import { useRef } from "react";
import {
	Pressable,
	ScrollView,
	type ScrollViewInstance,
	View,
} from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { useTokenColors } from "@/lib/use-token-color";
import { SEAT } from "../copy";
import { BOARD, type Stage } from "../first-run-motion";
import { ink } from "../first-run-palette";
import { type SEng, seatOpen } from "../story/story-scene";
import type { AuthProvider } from "../use-sign-in";
import { SeatButton } from "./seat-button";
import { useSeatIn } from "./seat-in";
import { SeatTerms } from "./seat-terms";
import { SeatWords } from "./seat-words";

const LOOP = require("@/assets/images/flux/flux-campfire-loop.webp");
const STILL = require("@/assets/images/flux/flux-campfire-still.webp");
/** Board `.sfx` (62, 214, 216 × 288) and the log at (246, 478, 88 × 18). */
const FLUX = { height: 288, left: 62, top: 214, width: 216 };
const LOG = { height: 18, left: 246, top: 478, width: 88 };
const BACK_TOP = 54;
const BACK_H = 38;
/** Under the largest text the column scrolls, starting this far below the back link. */
const BACK_GAP = 8;
/** "Back to the story" stays one line beside its chevron. */
const BACK_TEXT_MAX = 2;
/** The column ends where the board's terms did, above the home indicator. */
const BOTTOM_GAP = 20;

type Props = {
	eng: SharedValue<SEng>;
	stage: Stage;
	open: boolean;
	reduced: boolean;
	/** The provider signing in, if any. */
	signing: AuthProvider | null;
	seated: boolean;
	onBack: () => void;
	onSignIn: (provider: AuthProvider) => void;
};

/**
 * Sign-in is the seat: Flux at the fire (production's campfire loop; the still under Reduce
 * Motion), an empty log beside them, Apple first, then Google. The words, buttons and terms are
 * one column held to the bottom, so they grow with Dynamic Type over Flux and, at the largest
 * sizes, scroll under the back link.
 */
const LOG_TOKENS = ["first-run-log-1", "first-run-log-2"] as const;

export function SeatSheet({
	eng,
	stage,
	open,
	reduced,
	signing,
	seated,
	onBack,
	onSignIn,
}: Props) {
	const logColors = useTokenColors(LOG_TOKENS) as [string, string];
	const insets = useSafeAreaInsets();
	/** Opens on the buttons when the column is taller than the room it has. */
	const column = useRef<ScrollViewInstance>(null);
	const layer = useAnimatedStyle(() => ({ opacity: seatOpen(eng.get()) }));
	const back = useSeatIn(eng, 450, 400, 0);
	const flux = useSeatIn(eng, 180, 600, 20);
	const log = useSeatIn(eng, 420, 450, 12);
	const frame = {
		height: BOARD.h,
		left: stage.dx,
		top: stage.dy,
		width: BOARD.w,
	};
	return (
		<Animated.View
			accessibilityElementsHidden={!open}
			className="absolute inset-0"
			importantForAccessibility={open ? "auto" : "no-hide-descendants"}
			pointerEvents={open ? "box-none" : "none"}
			style={layer}
		>
			<View className="absolute" pointerEvents="box-none" style={frame}>
				<Animated.View
					className="absolute left-3.5"
					style={[{ minHeight: BACK_H, top: BACK_TOP }, back]}
				>
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ disabled: signing !== null }}
						className="flex-1 flex-row items-center gap-1.5 px-3"
						disabled={signing !== null}
						onPress={onBack}
					>
						<Svg
							fill="none"
							height={14}
							stroke={ink(0.72)}
							strokeLinecap="round"
							strokeWidth={2.6}
							viewBox="0 0 24 24"
							width={14}
						>
							<Path d="M15 6l-6 6 6 6" />
						</Svg>
						<AppText
							maxFontSizeMultiplier={BACK_TEXT_MAX}
							numberOfLines={1}
							style={{ color: ink(0.72), fontSize: 13.5, lineHeight: 17 }}
						>
							{SEAT.back}
						</AppText>
					</Pressable>
				</Animated.View>
				<Animated.View
					className="absolute"
					pointerEvents="none"
					style={[FLUX, flux]}
				>
					<Image
						accessibilityLabel={SEAT.fluxLabel}
						accessible
						autoplay={!reduced}
						contentFit="contain"
						placeholder={STILL}
						source={reduced ? STILL : LOOP}
						style={{ height: FLUX.height, width: FLUX.width }}
					/>
				</Animated.View>
				<Animated.View
					className="absolute"
					pointerEvents="none"
					style={[LOG, log]}
				>
					<LinearGradient
						className="flex-1 rounded-[9px] border-first-run-log-edge border-t-2"
						colors={logColors}
					/>
					<View className="absolute top-[3px] right-1 size-3 rounded-full border-[3px] border-first-run-knot-ring bg-first-run-knot-fill" />
				</Animated.View>
			</View>
			<ScrollView
				alwaysBounceVertical={false}
				className="absolute inset-x-0 bottom-0"
				contentContainerClassName="grow justify-end gap-2.5 px-6"
				contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_GAP }}
				onContentSizeChange={() =>
					column.current?.scrollToEnd({ animated: false })
				}
				ref={column}
				showsVerticalScrollIndicator={false}
				style={{ top: stage.dy + BACK_TOP + BACK_H + BACK_GAP }}
			>
				<View className="mb-3 px-1">
					<SeatWords eng={eng} seated={seated} />
				</View>
				<SeatButton
					busy={signing === "apple"}
					disabled={signing !== null}
					eng={eng}
					onPress={() => onSignIn("apple")}
					provider="apple"
				/>
				<SeatButton
					busy={signing === "google"}
					disabled={signing !== null}
					eng={eng}
					onPress={() => onSignIn("google")}
					provider="google"
				/>
				<View className="mt-1.5 px-1">
					<SeatTerms eng={eng} />
				</View>
			</ScrollView>
		</Animated.View>
	);
}
