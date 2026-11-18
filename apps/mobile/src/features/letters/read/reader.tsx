import { useHeaderHeight } from "expo-router/react-navigation";
import { type ComponentRef, useEffect, useRef } from "react";
import {
	type AccessibilityActionEvent,
	type AccessibilityActionInfo,
	AccessibilityInfo,
	findNodeHandle,
	Platform,
	ScrollView,
	View,
} from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { LETTERS } from "../copy";
import { LETTER_MOTION } from "../letter-motion";
import type { ReceivedLetter } from "../letters-model";
import { openReport } from "../letters-routes";
import { ReadActs, ReadFooter } from "./read-acts";
import { useReaderScreen } from "./read-data";
import { ReadLetter } from "./read-letter";
import { useReaderUndo } from "./reader-undo";
import { UndoPill } from "./undo-pill";

const O = LETTER_MOTION.open;
/** VoiceOver moves to the letter once its words are in. */
const FOCUS_MS = O.flapMs + O.bottomMs + O.words.ms;
/** Space under the header, above the fixed line. */
const UNDER_HEADER = 8;

/**
 * Reading a letter (handoff §1, §3, §5; renders 20–26, 35): the fixed line above it and nothing
 * else about it. Sealed, it opens by dragging up or with Open. Open: This reached me, Hide or
 * Unhide, Report, and the foot to Settings. Nothing sits over the words: the letter scrolls and
 * grows with Dynamic Type, and the bottom bar (Open, or Undo) sits below the scroll view.
 * VoiceOver can do all of it from the letter's actions as well as the buttons.
 */
export function Reader({
	letter,
	reduced,
}: {
	letter: ReceivedLetter;
	reduced: boolean;
}) {
	const reader = useReaderScreen();
	// iOS draws the header over the screen; Android's is opaque and the screen starts under it.
	const headerH = useHeaderHeight();
	const top = (Platform.OS === "ios" ? headerH : 0) + UNDER_HEADER;
	const u = useReaderUndo(reader);
	const sealed = !letter.opened;
	const words = useRef<ComponentRef<typeof View>>(null);
	const focus = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (focus.current) {
				clearTimeout(focus.current);
			}
		},
		[]
	);

	const open = () => {
		if (!sealed) {
			return;
		}
		playSoftPress();
		reader.actions.open();
		focus.current = setTimeout(
			() => {
				const tag = words.current ? findNodeHandle(words.current) : null;
				if (typeof tag === "number") {
					AccessibilityInfo.setAccessibilityFocus(tag);
				}
			},
			reduced ? LETTER_MOTION.reducedMs : FOCUS_MS
		);
	};
	const report = () => openReport(letter.id);

	const r = LETTERS.read;
	let actions: AccessibilityActionInfo[] = [{ label: r.undo, name: "undo" }];
	if (sealed) {
		actions = [{ label: r.open, name: "activate" }];
	} else if (!u.undo) {
		actions = [
			...(u.acknowledged
				? []
				: [{ label: r.acknowledge, name: "acknowledge" }]),
			u.hidden
				? { label: r.unhide, name: "unhide" }
				: { label: r.hide, name: "hide" },
			{ label: r.report, name: "report" },
		];
	}
	const run: Record<string, () => void> = {
		acknowledge: u.acknowledge,
		activate: open,
		hide: u.hide,
		report,
		undo: u.undoIt,
		unhide: u.unhide,
	};
	const onAction = (e: AccessibilityActionEvent) =>
		run[e.nativeEvent.actionName]?.();
	const showActs = !sealed && u.undo === null;

	return (
		<>
			<ScrollView
				contentContainerClassName="grow pb-6"
				contentContainerStyle={{ paddingTop: top }}
				contentInsetAdjustmentBehavior="never"
				scrollEnabled={!sealed}
			>
				<AppText
					className="mx-6 mb-[22px] text-center"
					color="muted"
					variant="detail"
				>
					{LETTERS.fixedLine}
				</AppText>
				<ReadLetter
					actions={actions}
					hiding={u.undo === "hide"}
					onAction={onAction}
					onCommit={open}
					reduced={reduced}
					sealed={sealed}
					stamped={u.acknowledged}
					text={letter.text}
					wordsRef={words}
				/>
				<ReadActs
					acknowledged={u.acknowledged}
					hidden={u.hidden}
					onAcknowledge={u.acknowledge}
					onHide={u.hide}
					onReport={report}
					onUnhide={u.unhide}
					reduced={reduced}
					show={showActs}
				/>
				<View className="grow" />
				<ReadFooter reduced={reduced} show={showActs} />
			</ScrollView>
			{sealed ? (
				<View className="px-4 pt-3 pb-safe-offset-4">
					<PressScale
						accessibilityRole="button"
						className="min-h-[50px] items-center justify-center rounded-full bg-foreground py-2"
						onPress={open}
					>
						<AppText color="background" variant="body" weight="semibold">
							{r.open}
						</AppText>
					</PressScale>
				</View>
			) : null}
			{u.undo ? (
				<UndoPill
					key={u.undo}
					label={u.undo === "ack" ? r.undoAcknowledged : r.undoHidden}
					onUndo={u.undoIt}
					reduced={reduced}
				/>
			) : null}
		</>
	);
}
