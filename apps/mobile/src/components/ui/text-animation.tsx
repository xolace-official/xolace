// TextAnimation: five ways text arrives, sharing duration/delay/loop/enabled
// defaults from the root. Typing and Counting stay nested Text (wraps, cannot be
// transformed); Rotating, Sliding and Scrolling are rows of views for transforms.

import { LinearGradient } from "expo-linear-gradient";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Text as RNText, View, type ViewProps } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedReaction,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { tv } from "tailwind-variants";
import { useCSSVariable } from "uniwind";
import { Text, type TextProps } from "@/components/ui/text";
import { cn } from "@/lib/cn";

const AnimatedText = Animated.createAnimatedComponent(RNText);

/** How long a caret spends lit, and then dark. */
const CARET_PERIOD = 520;
/** The spring every number rides. Slow enough to read the digits going past. */
const NUMBER_SPRING = { damping: 26, mass: 1, stiffness: 90 } as const;
/** How far a rotating phrase travels, in points. */
const ROTATE_DISTANCE = 22;

const textAnimationVariants = tv({
	slots: {
		caret: "text-foreground",
		column: "items-center",
		// tabular-nums on everything numeric: proportional digits change width as they roll.
		digits: "flex-row items-center tabular-nums",
		highlight: "rounded-lg bg-secondary",
	},
});

/* Root */

interface TextAnimationContextValue {
	delay?: number;
	duration?: number;
	enabled?: boolean;
	loop?: boolean;
}

const TextAnimationContext = createContext<TextAnimationContextValue>({});

export interface TextAnimationProps extends ViewProps {
	children?: ReactNode;
	className?: string;
	/** How long to wait before starting, in milliseconds. */
	delay?: number;
	/** Milliseconds per pass: a keystroke for Typing, a phrase's turn for Rotating, the run for
	 * counters. */
	duration?: number;
	/** `false` draws the finished state immediately, as reduced motion also does. */
	enabled?: boolean;
	/** Start again from the beginning when the run finishes. */
	loop?: boolean;
}

/** Shared defaults and a row to lay the parts out in. Optional: each part works standalone. */
function TextAnimationRoot({
	className,
	duration,
	delay,
	loop,
	enabled,
	children,
	...props
}: TextAnimationProps) {
	const value = useMemo(
		() => ({ delay, duration, enabled, loop }),
		[delay, duration, enabled, loop]
	);

	return (
		<TextAnimationContext.Provider value={value}>
			<View className={cn("flex-row items-center", className)} {...props}>
				{children}
			</View>
		</TextAnimationContext.Provider>
	);
}
TextAnimationRoot.displayName = "TextAnimation";

/** The part's own prop, then the root's, then the part's default. */
function useShared<K extends keyof TextAnimationContextValue>(
	key: K,
	own: TextAnimationContextValue[K],
	fallback: NonNullable<TextAnimationContextValue[K]>
): NonNullable<TextAnimationContextValue[K]> {
	const inherited = useContext(TextAnimationContext);
	return (own ?? inherited[key] ?? fallback) as NonNullable<
		TextAnimationContextValue[K]
	>;
}

/** Same colour at a given alpha: on Android a `transparent` gradient stop fades through black. */
function withAlpha(color: string, alpha: number): string {
	if (color.startsWith("#")) {
		const hex = color.slice(1);
		const full =
			hex.length === 3
				? hex
						.split("")
						.map((c) => c + c)
						.join("")
				: hex.slice(0, 6);
		const r = Number.parseInt(full.slice(0, 2), 16);
		const g = Number.parseInt(full.slice(2, 4), 16);
		const b = Number.parseInt(full.slice(4, 6), 16);
		if (Number.isNaN(r + g + b)) {
			return color;
		}
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	const channels = color.match(/rgba?\(([^)]+)\)/)?.[1];
	if (channels) {
		const [r, g, b] = channels.split(",").map((part) => part.trim());
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	return color;
}

/** True when nothing should move: asked for, or asked for by the system. */
function useStill(enabled: boolean): boolean {
	return useReducedMotion() || !enabled;
}

/* Typing */

export interface TextAnimationTypingProps extends Omit<TextProps, "children"> {
	/** Draw a blinking caret after the text. */
	caret?: boolean;
	/** Styles the caret. */
	caretClassName?: string;
	className?: string;
	/** Milliseconds before the first keystroke. */
	delay?: number;
	/** Milliseconds per keystroke. */
	duration?: number;
	enabled?: boolean;
	/** How long a finished string sits before it is erased, in milliseconds. */
	hold?: number;
	/** Start again after the last string. Only means anything for an array. */
	loop?: boolean;
	/** Called once the last string has finished being typed. */
	onDone?: () => void;
	/** What to type. An array is typed, held, erased and replaced by the next. */
	text: string | string[];
}

/** A string typed one character at a time. Reserves no height: size the container or content
 * below shifts. */
function TextAnimationTyping({
	className,
	text,
	duration,
	delay,
	hold = 1400,
	loop,
	caret = false,
	caretClassName,
	onDone,
	enabled,
	...props
}: TextAnimationTypingProps) {
	const step = useShared("duration", duration, 55);
	const wait = useShared("delay", delay, 0);
	const repeat = useShared("loop", loop, false);
	const still = useStill(useShared("enabled", enabled, true));

	const strings = useMemo(
		() => (typeof text === "string" ? [text] : text),
		[text]
	);
	const [shown, setShown] = useState("");
	const [typing, setTyping] = useState(false);

	// Ref so a new inline onDone does not restart the run.
	const done = useRef(onDone);
	useEffect(() => {
		done.current = onDone;
	}, [onDone]);

	useEffect(() => {
		if (still) {
			return;
		}

		let pending: ReturnType<typeof setTimeout> | undefined;
		let cancelled = false;

		const run = (index: number) => {
			const value = strings[index] ?? "";
			let at = 0;
			setTyping(true);

			const type = () => {
				if (cancelled) {
					return;
				}
				setShown(value.slice(0, at));
				if (at < value.length) {
					at += 1;
					pending = setTimeout(type, step);
					return;
				}
				setTyping(false);
				const last = index === strings.length - 1;
				if (last && !repeat) {
					done.current?.();
					return;
				}
				pending = setTimeout(() => erase(value, index), hold);
			};

			type();
		};

		const erase = (value: string, index: number) => {
			if (cancelled) {
				return;
			}
			let at = value.length;
			setTyping(true);

			const back = () => {
				if (cancelled) {
					return;
				}
				setShown(value.slice(0, at));
				if (at > 0) {
					at -= 1;
					pending = setTimeout(back, step);
					return;
				}
				setTyping(false);
				run(index === strings.length - 1 ? 0 : index + 1);
			};

			back();
		};

		pending = setTimeout(() => run(0), wait);

		return () => {
			cancelled = true;
			clearTimeout(pending);
		};
	}, [hold, repeat, step, still, strings, wait]);

	return (
		// Nested in the text rather than beside it: a sibling caret sits at the end of
		// the whole block once a line wraps; nested, it follows the last character.
		<Text className={className} {...props}>
			{still ? (strings[0] ?? "") : shown}
			{caret ? (
				<TypingCaret
					blinking={still || !typing}
					className={caretClassName}
					still={still}
				/>
			) : null}
		</Text>
	);
}
TextAnimationTyping.displayName = "TextAnimation.Typing";

/** Solid while characters arrive, blinking while idle. A glyph, so it line-breaks and sizes
 * with the font. */
function TypingCaret({
	blinking,
	still,
	className,
}: {
	blinking: boolean;
	still: boolean;
	className?: string;
}) {
	const { caret } = textAnimationVariants();
	const opacity = useSharedValue(1);

	useEffect(() => {
		if (still || !blinking) {
			cancelAnimation(opacity);
			opacity.value = 1;
			return;
		}
		opacity.value = withRepeat(
			withSequence(
				withTiming(1, { duration: CARET_PERIOD }),
				withTiming(0, { duration: CARET_PERIOD })
			),
			-1,
			false
		);
		return () => cancelAnimation(opacity);
	}, [blinking, opacity, still]);

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

	return (
		<AnimatedText
			// Decorative: the text it follows is what a screen reader should read.
			accessibilityElementsHidden
			className={caret({ className })}
			importantForAccessibility="no-hide-descendants"
			style={style}
		>
			{"\u258F"}
		</AnimatedText>
	);
}

/* Rotating */

export interface TextAnimationRotatingProps
	extends Omit<TextProps, "children"> {
	className?: string;
	/** Milliseconds before the first change. */
	delay?: number;
	/** How long each phrase holds, in milliseconds. */
	duration?: number;
	enabled?: boolean;
	/** The phrases to cycle. One string never rotates, which is a valid state. */
	text: string | string[];
}

/** One phrase leaves upward as the next arrives from below. A zero-height sizer holding every
 * phrase gives the box the longest phrase's width, so it never resizes or clips. */
function TextAnimationRotating({
	className,
	text,
	duration,
	delay,
	enabled,
	...props
}: TextAnimationRotatingProps) {
	const period = useShared("duration", duration, 2200);
	const wait = useShared("delay", delay, 0);
	const still = useStill(useShared("enabled", enabled, true));

	const phrases = useMemo(
		() => (typeof text === "string" ? [text] : text),
		[text]
	);
	const [index, setIndex] = useState(0);

	useEffect(() => {
		if (still || phrases.length < 2) {
			return;
		}
		let interval: ReturnType<typeof setInterval> | undefined;
		const start = setTimeout(() => {
			setIndex((current) => (current + 1) % phrases.length);
			interval = setInterval(
				() => setIndex((current) => (current + 1) % phrases.length),
				period
			);
		}, wait + period);

		return () => {
			clearTimeout(start);
			if (interval) {
				clearInterval(interval);
			}
		};
	}, [period, phrases.length, still, wait]);

	return (
		<View className={cn("overflow-hidden", className)}>
			{/* Sizer: zero height, invisible, contributes only the longest phrase's width. */}
			<View
				accessibilityElementsHidden
				pointerEvents="none"
				style={{ height: 0 }}
			>
				{phrases.map((phrase, at) => (
					<Text key={at} {...props} className="opacity-0">
						{phrase}
					</Text>
				))}
			</View>

			{phrases.map((phrase, at) => (
				<RotatingPhrase
					active={at === index}
					key={at}
					// The first is in flow and gives the box its height; the rest stack over it.
					measured={at === 0}
					phrase={phrase}
					still={still}
					textProps={props}
				/>
			))}
		</View>
	);
}
TextAnimationRotating.displayName = "TextAnimation.Rotating";

function RotatingPhrase({
	phrase,
	measured,
	active,
	still,
	textProps,
}: {
	phrase: string;
	measured: boolean;
	active: boolean;
	still: boolean;
	textProps: Omit<TextProps, "children">;
}) {
	const travel = useSharedValue(active ? 0 : ROTATE_DISTANCE);
	const opacity = useSharedValue(active ? 1 : 0);

	useEffect(() => {
		if (still) {
			travel.value = active ? 0 : ROTATE_DISTANCE;
			opacity.value = active ? 1 : 0;
			return;
		}
		if (active) {
			// Reset so a phrase coming back arrives from below again.
			travel.value = ROTATE_DISTANCE;
			travel.value = withTiming(0, {
				duration: 300,
				easing: Easing.out(Easing.cubic),
			});
			opacity.value = withTiming(1, { duration: 240 });
		} else {
			travel.value = withTiming(-ROTATE_DISTANCE, {
				duration: 300,
				easing: Easing.in(Easing.cubic),
			});
			opacity.value = withTiming(0, { duration: 200 });
		}
	}, [active, opacity, still, travel]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: travel.value }],
	}));

	return (
		<Animated.View
			// Only the phrase on screen is announced.
			accessibilityElementsHidden={!active}
			importantForAccessibility={active ? "auto" : "no-hide-descendants"}
			style={[
				style,
				measured ? undefined : { left: 0, position: "absolute", right: 0 },
			]}
		>
			<Text {...textProps}>{phrase}</Text>
		</Animated.View>
	);
}

/* Counting */

/** Formats a number the way both counting parts agree to. */
function useFormatter(
	decimals: number,
	formatOptions?: Intl.NumberFormatOptions
) {
	return useMemo(() => {
		if (formatOptions) {
			try {
				const format = new Intl.NumberFormat(undefined, formatOptions);
				return (value: number) => format.format(value);
			} catch {
				// Some engines ship a partial Intl; fall through to the plain form.
			}
		}
		return (value: number) => value.toFixed(decimals);
	}, [decimals, formatOptions]);
}

export interface TextAnimationCountingProps
	extends Omit<TextProps, "children"> {
	className?: string;
	/** Digits after the point. */
	decimals?: number;
	/** Milliseconds before it starts. */
	delay?: number;
	/** How long the whole journey takes, in milliseconds. */
	duration?: number;
	enabled?: boolean;
	/** `Intl.NumberFormat` options; falls back to fixed-point where Intl cannot. */
	formatOptions?: Intl.NumberFormatOptions;
	/** Where it starts from. Defaults to zero. */
	from?: number;
	/** Where the number ends up. */
	value: number;
}

/** A number counting up to itself. Progress runs on the UI thread; only the rounded value
 * reaches state. */
function TextAnimationCounting({
	className,
	value,
	from = 0,
	duration,
	delay,
	decimals = 0,
	formatOptions,
	enabled,
	...props
}: TextAnimationCountingProps) {
	const span = useShared("duration", duration, 1200);
	const wait = useShared("delay", delay, 0);
	const still = useStill(useShared("enabled", enabled, true));

	const format = useFormatter(decimals, formatOptions);
	const progress = useSharedValue(still ? value : from);
	const [shown, setShown] = useState(from);

	useEffect(() => {
		if (still) {
			cancelAnimation(progress);
			progress.value = value;
			return;
		}
		progress.value = from;
		const timer = setTimeout(() => {
			progress.value = withTiming(value, {
				duration: span,
				// Settles at the end so the last digits are readable.
				easing: Easing.out(Easing.cubic),
			});
		}, wait);

		return () => {
			clearTimeout(timer);
			cancelAnimation(progress);
		};
	}, [from, progress, span, still, value, wait]);

	const factor = 10 ** decimals;

	useAnimatedReaction(
		() => Math.round(progress.value * factor) / factor,
		(current, previous) => {
			if (current !== previous) {
				scheduleOnRN(setShown, current);
			}
		}
	);

	return (
		<Text
			// Screen readers get the final value, not a slot machine.
			accessibilityLabel={format(value)}
			className={cn("tabular-nums", className)}
			{...props}
		>
			{format(still ? value : shown)}
		</Text>
	);
}
TextAnimationCounting.displayName = "TextAnimation.Counting";

/* Sliding */

export interface TextAnimationSlidingProps extends ViewProps {
	className?: string;
	/** The decimal mark. */
	decimalSeparator?: string;
	/** Digits after the point. */
	decimals?: number;
	/** Milliseconds before the roll starts. */
	delay?: number;
	enabled?: boolean;
	/** Pad the whole part to this many digits with leading zeroes. */
	padStart?: number;
	/** Size of the digits, as on `Text`. */
	size?: TextProps["size"];
	/** Styles the digits. */
	textClassName?: string;
	/** A separator every three digits — `','` for `1,024`. */
	thousandSeparator?: string;
	/** The number to show. Each digit rolls to its new value independently. */
	value: number;
	/** Weight of the digits, as on `Text`. */
	weight?: TextProps["weight"];
}

/** An odometer: each digit is a column of ten moved by a fraction of its own height, so nothing
 * is measured. A hidden `0` in flow gives the height. */
function TextAnimationSliding({
	className,
	value,
	decimals = 0,
	padStart = 1,
	thousandSeparator,
	decimalSeparator = ".",
	textClassName,
	size,
	weight,
	delay,
	enabled,
	...props
}: TextAnimationSlidingProps) {
	const wait = useShared("delay", delay, 0);
	const still = useStill(useShared("enabled", enabled, true));
	const { digits } = textAnimationVariants();

	const { whole, fraction, negative } = useMemo(() => {
		const absolute = Math.abs(value);
		const fixed = absolute.toFixed(decimals);
		const [left = "0", right = ""] = fixed.split(".");
		return {
			fraction: right,
			negative: value < 0,
			whole: left.padStart(padStart, "0"),
		};
	}, [decimals, padStart, value]);

	const columns: ReactNode[] = [];

	whole.split("").forEach((digit, index) => {
		const fromEnd = whole.length - index - 1;
		columns.push(
			<SlidingColumn
				className={textClassName}
				delay={wait}
				digit={Number(digit)}
				key={`w${index}`}
				size={size}
				still={still}
				weight={weight}
			/>
		);
		if (thousandSeparator && fromEnd > 0 && fromEnd % 3 === 0) {
			columns.push(
				<Text
					className={textClassName}
					key={`s${index}`}
					size={size}
					weight={weight}
				>
					{thousandSeparator}
				</Text>
			);
		}
	});

	if (fraction) {
		columns.push(
			<Text className={textClassName} key="point" size={size} weight={weight}>
				{decimalSeparator}
			</Text>
		);
		fraction.split("").forEach((digit, index) => {
			columns.push(
				<SlidingColumn
					className={textClassName}
					delay={wait}
					digit={Number(digit)}
					key={`f${index}`}
					size={size}
					still={still}
					weight={weight}
				/>
			);
		});
	}

	return (
		<View
			accessibilityLabel={`${negative ? "-" : ""}${whole}${fraction ? decimalSeparator + fraction : ""}`}
			// One accessible node, so a screen reader says the number, not ten digits per column.
			accessibilityRole="text"
			className={digits({ className })}
			{...props}
		>
			{negative ? (
				<Text className={textClassName} size={size} weight={weight}>
					−
				</Text>
			) : null}
			{columns}
		</View>
	);
}
TextAnimationSliding.displayName = "TextAnimation.Sliding";

const TEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function SlidingColumn({
	digit,
	delay,
	still,
	className,
	size,
	weight,
}: {
	digit: number;
	delay: number;
	still: boolean;
	className?: string;
	size?: TextProps["size"];
	weight?: TextProps["weight"];
}) {
	const { column } = textAnimationVariants();
	const offset = useSharedValue(still ? digit : 0);

	useEffect(() => {
		if (still) {
			cancelAnimation(offset);
			offset.value = digit;
			return;
		}
		const timer = setTimeout(() => {
			offset.value = withSpring(digit, NUMBER_SPRING);
		}, delay);
		return () => {
			clearTimeout(timer);
			cancelAnimation(offset);
		};
	}, [delay, digit, offset, still]);

	// Percentage of the column's own height: -n/10 puts the nth digit in the window, unmeasured.
	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: `${(-offset.value / TEN.length) * 100}%` }],
	}));

	return (
		<View className="overflow-hidden">
			{/* In flow and invisible: gives the window a digit's height and width. */}
			<Text className={cn("opacity-0", className)} size={size} weight={weight}>
				0
			</Text>
			<Animated.View
				className={column()}
				style={[style, { position: "absolute", top: 0 }]}
			>
				{TEN.map((n) => (
					<Text
						className={cn("tabular-nums", className)}
						key={n}
						size={size}
						weight={weight}
					>
						{n}
					</Text>
				))}
			</Animated.View>
		</View>
	);
}

/* Scrolling */

export interface TextAnimationScrollingProps extends ViewProps {
	/** How many values to show above and below the one in the window. */
	around?: number;
	className?: string;
	/** Milliseconds before it starts. */
	delay?: number;
	/** How long the run takes, in milliseconds. */
	duration?: number;
	enabled?: boolean;
	/** Colour the window edges fade into, a token or any colour matching the surface. `false`
	 * disables. */
	fadeColor?: string | false;
	/** Formatting for each value, as `Intl.NumberFormat` options. */
	formatOptions?: Intl.NumberFormatOptions;
	/** Draw a band behind the value in the window. */
	highlight?: boolean;
	/** Styles that band. */
	highlightClassName?: string;
	/** Size of the values, as on `Text`. */
	size?: TextProps["size"];
	/** The gap between the values either side of it. */
	step?: number;
	/** Styles the values. */
	textClassName?: string;
	/** The value to land on. */
	value: number;
	/** Weight of the values, as on `Text`. */
	weight?: TextProps["weight"];
}

/** A column of values scrolling past a window to rest on one: "chosen from a scale", not
 * "changed". */
function TextAnimationScrolling({
	className,
	value,
	step = 1,
	around = 2,
	duration,
	delay,
	formatOptions,
	textClassName,
	size,
	weight,
	highlight = false,
	highlightClassName,
	fadeColor = "--color-background",
	enabled,
	...props
}: TextAnimationScrollingProps) {
	const span = useShared("duration", duration, 1400);
	const wait = useShared("delay", delay, 0);
	const still = useStill(useShared("enabled", enabled, true));
	const { column, highlight: band } = textAnimationVariants();

	const token = useCSSVariable(
		typeof fadeColor === "string" && fadeColor.startsWith("--")
			? fadeColor
			: "--color-background"
	);
	const resolvedToken = typeof token === "string" ? token : undefined;
	const fade =
		fadeColor === false
			? undefined
			: ((fadeColor.startsWith("--") ? resolvedToken : fadeColor) ??
				resolvedToken);

	const format = useFormatter(0, formatOptions);

	// The window shows `around` either side of the resting value, so the run
	// starts that many steps below zero and ends that many above the target.
	const values = useMemo(() => {
		// A zero or negative step would never terminate the walk below.
		const size = Math.abs(step) || 1;
		const floor = -around * size;
		// Walk down from `value` so the run always contains it exactly, whatever
		// `value` is relative to `step`, then `around` more above it.
		const out: number[] = [value];
		for (let v = value - size; v >= floor && out.length < 400; v -= size) {
			out.push(v);
		}
		out.reverse();
		for (let i = 1; i <= around; i += 1) {
			out.push(value + i * size);
		}
		return out;
	}, [around, step, value]);

	const rows = around * 2 + 1;
	// Rest `around` short of the target's index so the answer sits mid-window, not at the top edge.
	const found = values.indexOf(value);
	const target = Math.max(0, (found >= 0 ? found : values.length - 1) - around);

	const offset = useSharedValue(still ? target : 0);

	useEffect(() => {
		if (still) {
			cancelAnimation(offset);
			offset.value = target;
			return;
		}
		offset.value = 0;
		const timer = setTimeout(() => {
			offset.value = withTiming(target, {
				duration: span,
				easing: Easing.out(Easing.cubic),
			});
		}, wait);
		return () => {
			clearTimeout(timer);
			cancelAnimation(offset);
		};
	}, [offset, span, still, target, wait]);

	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: `${(-offset.value / values.length) * 100}%` }],
	}));

	return (
		<View
			accessibilityLabel={format(value)}
			accessibilityRole="text"
			className={cn("overflow-hidden", className)}
			{...props}
		>
			{/* `rows` invisible values in flow size the window. */}
			<View className="opacity-0">
				{Array.from({ length: rows }, (_, i) => (
					<Text className={textClassName} key={i} size={size} weight={weight}>
						0
					</Text>
				))}
			</View>

			{/* One row tall, mid-window, behind the column. */}
			{highlight ? (
				<View
					className={band({ className: highlightClassName })}
					pointerEvents="none"
					style={{
						height: `${(1 / rows) * 100}%`,
						left: 0,
						position: "absolute",
						right: 0,
						top: `${(around / rows) * 100}%`,
					}}
				/>
			) : null}

			<Animated.View
				className={column()}
				style={[style, { left: 0, position: "absolute", right: 0, top: 0 }]}
			>
				{values.map((entry) => (
					<Text
						className={cn("tabular-nums", textClassName)}
						key={entry}
						size={size}
						weight={weight}
					>
						{format(entry)}
					</Text>
				))}
			</Animated.View>

			{/* Edges fade into the surface so the column reads as continuing. Painted: a mask
			    needs a native module. */}
			{fade ? (
				<>
					<LinearGradient
						colors={[fade, withAlpha(fade, 0)]}
						pointerEvents="none"
						style={{
							height: `${(around / rows) * 100}%`,
							left: 0,
							position: "absolute",
							right: 0,
							top: 0,
						}}
					/>
					<LinearGradient
						colors={[withAlpha(fade, 0), fade]}
						pointerEvents="none"
						style={{
							bottom: 0,
							height: `${(around / rows) * 100}%`,
							left: 0,
							position: "absolute",
							right: 0,
						}}
					/>
				</>
			) : null}
		</View>
	);
}
TextAnimationScrolling.displayName = "TextAnimation.Scrolling";

export const TextAnimation = Object.assign(TextAnimationRoot, {
	Counting: TextAnimationCounting,
	Rotating: TextAnimationRotating,
	Scrolling: TextAnimationScrolling,
	Sliding: TextAnimationSliding,
	Typing: TextAnimationTyping,
});
