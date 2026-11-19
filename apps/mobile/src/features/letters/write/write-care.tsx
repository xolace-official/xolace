import { router } from "expo-router";
import { type ComponentRef, useEffect, useRef } from "react";
import {
	AccessibilityInfo,
	findNodeHandle,
	Pressable,
	type Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useThemeFaces } from "@/design/fonts";
import { LETTERS } from "../copy";
import { Fade } from "../fade";
import { LETTER_MOTION } from "../letter-motion";

const M = LETTER_MOTION.risk;
/** The sheet rises this far as it fades in. */
const RISE = 40;
const BOTTOM = { extra: 8, least: 16 };
/** Intake's care title (board `.care h3`): display bold 24/28, −.02em. */
const TITLE = { fontSize: 24, letterSpacing: -0.48, lineHeight: 28 } as const;

/**
 * At risk (#750, handoff §3): no send and no rejection line. Reflect's care instead, in its words:
 * "I hear you.", Show me who I can talk to, Breathe with me first (Sit with this, Three breaths),
 * Talk to a Xolacer, Not right now. The draft stays on the device whichever way they go, and the
 * sheet is still here on the way back. It rises 40 pt (320 ms, roll); reduced, it fades. Once
 * it's in, VoiceOver moves to "I hear you." (Send has gone, so nothing else holds focus).
 */
export function WriteCare({
	open,
	reduced,
	onClose,
	onLeave,
}: {
	open: boolean;
	reduced: boolean;
	/** Not right now, or a tap on the scrim: the letter unfolds, no line. */
	onClose: () => void;
	/**
	 * Before a button opens another screen. Write keeps the sheet for the way back; the late-risk
	 * host, drawn over the stack, closes it so it doesn't cover the screen it opened.
	 */
	onLeave?: () => void;
}) {
	const insets = useSafeAreaInsets();
	const faces = useThemeFaces();
	const c = LETTERS.care;
	const title = useRef<ComponentRef<typeof Text>>(null);
	useEffect(() => {
		if (!open) {
			return;
		}
		const t = setTimeout(
			() => {
				const tag = title.current ? findNodeHandle(title.current) : null;
				if (typeof tag === "number") {
					AccessibilityInfo.setAccessibilityFocus(tag);
				}
			},
			reduced ? LETTER_MOTION.reducedMs : M.sheetMs
		);
		return () => clearTimeout(t);
	}, [open, reduced]);
	return (
		<View
			accessibilityViewIsModal={open}
			className="absolute inset-0"
			pointerEvents={open ? "box-none" : "none"}
		>
			<Fade
				className="absolute inset-0"
				ms={M.sheetMs}
				on={open}
				reduced={reduced}
			>
				<Pressable
					accessibilityElementsHidden
					className="flex-1 bg-scrim"
					importantForAccessibility="no-hide-descendants"
					onPress={onClose}
				/>
			</Fade>
			<Fade
				className="absolute right-0 bottom-0 left-0 gap-3 rounded-t-[28px] border-continuous bg-surface px-4.5 pt-6 shadow-card"
				ms={M.sheetMs}
				on={open}
				reduced={reduced}
				rise={RISE}
				style={{
					paddingBottom: Math.max(insets.bottom, BOTTOM.least) + BOTTOM.extra,
				}}
			>
				<AppText
					accessibilityRole="header"
					ref={title}
					style={{ ...TITLE, fontFamily: faces["display-bold"] }}
					variant="title"
				>
					{c.title}
				</AppText>
				<AppText color="muted" variant="callout">
					{c.body}
				</AppText>
				<Big
					label={c.show}
					onPress={() => {
						onLeave?.();
						router.push("/crisis-resources");
					}}
				/>
				<Quiet
					label={c.breathe}
					onPress={() => {
						onLeave?.();
						router.push({
							params: { from: "letter" },
							pathname: "/sit-with-this",
						});
					}}
				/>
				<Quiet
					label={c.talk}
					onPress={() => {
						onLeave?.();
						router.dismissTo("/connect");
					}}
				/>
				<PressScale
					accessibilityRole="button"
					className="min-h-11 items-center justify-center"
					onPress={onClose}
				>
					<AppText color="muted" variant="callout" weight="medium">
						{c.notNow}
					</AppText>
				</PressScale>
			</Fade>
		</View>
	);
}

function Big({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<PressScale
			accessibilityRole="button"
			className="min-h-14 items-center justify-center rounded-full bg-foreground px-4"
			onPress={onPress}
		>
			<AppText color="background" variant="body" weight="semibold">
				{label}
			</AppText>
		</PressScale>
	);
}

function Quiet({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<PressScale
			accessibilityRole="button"
			className="min-h-12 items-center justify-center rounded-full bg-surface-secondary px-4"
			onPress={onPress}
		>
			<AppText variant="callout" weight="semibold">
				{label}
			</AppText>
		</PressScale>
	);
}
