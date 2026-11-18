import { Link, useIsFocused } from "expo-router";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { canAppleZoom } from "@/lib/apple-zoom";
import { COPY } from "../copy";
import { PILL_SLOT } from "../header/today-header";
import { useToday } from "../today-data";
import { useOnScreen, useShown, useTodayFrame } from "../today-frame";
import { cardA11yHint, cardFace } from "../today-model";
import { CardA11y, type Frame, sameFrame } from "./card-a11y";
import { CardBody } from "./card-body";
import { CardLight } from "./card-light";
import { Choices } from "./choices";
import { DOORS, doorsCopy, HERO } from "./hero-model";
import { HeroPressable } from "./hero-pressable";
import { useHold } from "./use-hold";

const FALLBACK_H = 230;

/**
 * The door into Reflect, and the sky's horizon. Tap: the card zooms into Reflect (iOS 18+;
 * elsewhere, and with Reduce Motion, Reflect's own transition). Hold 0.6 s: the spectrum laps
 * the rim and the doors rise out of the hint line. Holding a session, it says where a tap lands.
 */
export function ReflectCard() {
	const { state, actions } = useToday();
	const { live, reduced, low } = useTodayFrame();
	const late = state.phase === "late";
	const { mode, reflect } = state.card;
	const idle = mode === "idle";
	const face = cardFace(mode);
	const prompt = face?.title ?? COPY.card.prompt[state.phase];
	const monthPrompt = face ? null : state.card.monthPrompt;
	const doors = doorsCopy(DOORS);
	const hold = useHold(reduced, idle);
	const focused = useIsFocused();
	const [size, setSize] = useState<{ w: number; h: number } | null>(null);
	// Where the input and mic sit, for VoiceOver's copy of the card (card-a11y).
	const [input, setInput] = useState<Frame | null>(null);
	const [mic, setMic] = useState<Frame | null>(null);

	// Coming back from Talk, Vent or Sit: the card is at rest again. Or a mirror started
	// waiting while the doors were open.
	const { chosen, unchoose, release, rest } = hold;
	useEffect(() => {
		if (!(focused && idle) && chosen) {
			unchoose();
		}
	}, [focused, idle, chosen, unchoose]);
	// A tap's lit rim lets go once Reflect covers the card, and is drawn back by the time you return.
	useEffect(() => {
		if (focused) {
			rest();
		} else {
			release();
		}
	}, [focused, release, rest]);

	// Write instead: VoiceOver goes back to the card, which comes back in place of the doors.
	const cardRef = useRef<ComponentRef<typeof View>>(null);
	const [refocus, setRefocus] = useState(false);
	const writeInstead = () => {
		unchoose();
		setRefocus(true);
	};
	useEffect(() => {
		if (!refocus || chosen) {
			return;
		}
		const id = setTimeout(() => {
			setRefocus(false);
			if (cardRef.current) {
				AccessibilityInfo.sendAccessibilityEvent(cardRef.current, "focus");
			}
		}, HERO.bodyOutMs);
		return () => clearTimeout(id);
	}, [refocus, chosen]);

	const top = useSharedValue(0);
	const onScreen = useOnScreen(top, size?.h ?? FALLBACK_H);
	// The light's breath and the placeholder's rotation run natively; they stop off screen.
	const shown = useShown(onScreen);
	const running = live && shown;
	const bodyStyle = useAnimatedStyle(() => ({ opacity: hold.body.get() }));
	const scaleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: hold.scale.get() }],
	}));
	const placeholders = late
		? COPY.card.placeholders.late
		: COPY.card.placeholders.day;

	return (
		<View
			className="mx-4"
			onLayout={(e) => top.set(e.nativeEvent.layout.y)}
			style={{
				marginTop: (late ? HERO.marginTopLate : HERO.marginTop) - PILL_SLOT,
			}}
		>
			<Link
				asChild
				href={reflect}
				onPress={(e) => {
					// A press that became a scroll or a hold doesn't open Reflect.
					if (!hold.tapAllowed()) {
						e.preventDefault();
						return;
					}
					hold.sweep();
					actions.pressReflect();
				}}
			>
				<Link.Trigger withAppleZoom={!reduced && canAppleZoom()}>
					<HeroPressable
						hold={hold}
						onLayout={(e) => {
							const { width: w, height: h } = e.nativeEvent.layout;
							if (!size || size.w !== w || size.h !== h) {
								setSize({ h, w });
							}
						}}
					>
						{size ? (
							<CardLight
								breathing={running}
								h={size.h}
								late={late}
								low={low}
								reduced={reduced}
								rim={hold.rim}
								rimOpacity={hold.rimOpacity}
								w={size.w}
							/>
						) : null}
						<Animated.View
							className="gap-4.5"
							pointerEvents={chosen ? "none" : "auto"}
							style={[
								{
									paddingBottom: HERO.pad.bottom,
									paddingHorizontal: HERO.pad.x,
									paddingTop: HERO.pad.top,
								},
								bodyStyle,
							]}
						>
							<CardBody
								hint={face?.hint ?? doors.hint}
								late={late}
								mode={mode}
								monthPrompt={monthPrompt}
								onInput={(f) => !sameFrame(input, f) && setInput(f)}
								onMic={(f) => !sameFrame(mic, f) && setMic(f)}
								phase={state.phase}
								placeholders={placeholders}
								prompt={prompt}
								reduced={reduced}
								running={running}
							/>
						</Animated.View>
					</HeroPressable>
				</Link.Trigger>
			</Link>
			{/* Outside the touch surface, where VoiceOver can reach them (card-a11y). */}
			<Animated.View
				className="absolute inset-0"
				pointerEvents="box-none"
				style={scaleStyle}
			>
				{chosen ? (
					<Choices onBack={writeInstead} />
				) : size && (!idle || (input && mic)) ? (
					<CardA11y
						card={{ height: size.h, width: size.w, x: 0, y: 0 }}
						cardRef={cardRef}
						doorsAction={doors.action}
						field={
							idle && input && mic
								? {
										input,
										label: (placeholders[0] ?? "").replace("…", ""),
										mic: { ...mic, x: input.x + mic.x, y: input.y + mic.y },
									}
								: undefined
						}
						hint={cardA11yHint(mode, doors.a11yHint)}
						onDoors={idle ? hold.chooseFromA11y : undefined}
						prompt={
							monthPrompt ? `${COPY.card.monthLabel}. ${monthPrompt}` : prompt
						}
					/>
				) : null}
			</Animated.View>
		</View>
	);
}
