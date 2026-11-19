import { type ComponentRef, type RefObject, useEffect, useRef } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { useSheetClose } from "@/components/shared/detached-sheet";
import { PressScale } from "@/components/shared/press-scale";
import { useScheme } from "@/design/scheme";
import { cn } from "@/lib/cn";
import { playFollowUpEntrance } from "@/lib/haptics";
import {
	checkInRow,
	copyOf,
	promptRow,
	type RowId,
	rowsOf,
} from "../coming-back-model";
import { WELCOME_BACK } from "../copy";
import { useWelcomeBack } from "../welcome-back-data";
import { GreetingRow, type RowLook } from "./greeting-row";

/**
 * Board `.pgl` 30 / 20 / 20 (26 top in "Still here."), gap 14; `.gt` 30 / 1.08 (26), tracking
 * −.03em; `.gb` 15.5 / 1.42; `.cta` 56.
 */
const TITLE = { greet: 30, leading: 1.08, left: 26, tracking: -0.03 } as const;
const BODY = { fontSize: 15.5, lineHeight: 22 } as const;
const CTA = { fontSize: 17 } as const;
/** VoiceOver moves to the row once the check-in has gone (or the tick has landed). */
const FOCUS_AFTER_MS = 500;

type RowRef = RefObject<ComponentRef<typeof View> | null>;

const focusLater = (ref: RowRef) =>
	setTimeout(() => {
		if (ref.current) {
			AccessibilityInfo.sendAccessibilityEvent(ref.current, "focus");
		}
	}, FOCUS_AFTER_MS);

/** Each row's glyph and its circle's wash and ink. The prompt's rose has a dark twin. */
const lookOf = (id: RowId, dark: boolean): RowLook => {
	if (id === "fz") {
		return {
			bg: "ember-wash",
			fg: "ember",
			icon: { android: "local_fire_department", ios: "flame.fill" },
		};
	}
	if (id === "ck") {
		return {
			bg: "accent-wash",
			fg: "accent-ink",
			icon: { android: "history", ios: "arrow.counterclockwise" },
		};
	}
	return {
		bg: dark ? "month-rose-wash-dark" : "month-rose-wash",
		fg: dark ? "month-rose-dark" : "month-rose",
		icon: { android: "favorite", ios: "heart" },
	};
};

/** The list page (handoff §2): the tier's hello, what happened while you were away, one button. */
export function GreetingList() {
	const { state, actions } = useWelcomeBack();
	const close = useSheetClose();
	const dark = useScheme() === "dark";
	const { items, outcomes, mode, just, tickKey, ciOpen, reduced } = state;
	const left = mode === "left";
	const copy = copyOf(state.away, mode, items, outcomes, state.name);
	const rows = rowsOf(items, mode);
	const ckRef = useRef<ComponentRef<typeof View>>(null);
	const pmRef = useRef<ComponentRef<typeof View>>(null);

	// VoiceOver returns to the row you opened: after a tick, or when the check-in closes unanswered.
	useEffect(() => {
		if (!just || tickKey === 0) {
			return;
		}
		const id = focusLater(just === "ck" ? ckRef : pmRef);
		return () => clearTimeout(id);
	}, [tickKey, just]);
	const wasOpen = useRef(ciOpen);
	useEffect(() => {
		const closedNow = wasOpen.current && !ciOpen;
		wasOpen.current = ciOpen;
		if (!closedNow) {
			return;
		}
		const id = focusLater(ckRef);
		return () => clearTimeout(id);
	}, [ciOpen]);

	const row = (id: RowId) => {
		const look = lookOf(id, dark);
		if (id === "fz") {
			const c = WELCOME_BACK.freeze;
			const sub = c.sub(items.freeze?.streak ?? 0);
			return (
				<GreetingRow
					done={false}
					key={id}
					label={`${c.title}. ${sub}`}
					look={look}
					reduced={reduced}
					sub={sub}
					tick={0}
					title={c.title}
				/>
			);
		}
		const tick = just === id ? tickKey : 0;
		const r =
			id === "ck"
				? checkInRow(items.day, outcomes)
				: promptRow(outcomes.prompt);
		const onPress =
			id === "ck"
				? () => {
						playFollowUpEntrance();
						actions.openCheckIn();
					}
				: () => {
						Presets.System.selection();
						actions.openPrompt();
					};
		return (
			<GreetingRow
				done={r.done}
				key={id}
				label={r.label}
				look={look}
				onPress={onPress}
				reduced={reduced}
				ref={id === "ck" ? ckRef : pmRef}
				sub={r.sub}
				tick={tick}
				title={r.title}
			/>
		);
	};

	const size = left ? TITLE.left : TITLE.greet;
	return (
		<View className={cn("gap-3.5 px-5 pb-5", left ? "pt-6.5" : "pt-7.5")}>
			<View className="gap-1.5 px-2">
				<AppText
					accessibilityRole="header"
					center
					style={{
						fontSize: size,
						letterSpacing: TITLE.tracking * size,
						lineHeight: size * TITLE.leading,
					}}
					variant="greeting"
				>
					{copy.title}
				</AppText>
				<AppText center color="muted" style={BODY} variant="callout">
					{copy.body}
				</AppText>
			</View>
			{rows.length > 0 ? (
				<View className="mx-1 gap-px bg-separator">{rows.map(row)}</View>
			) : null}
			<PressScale
				className="h-14 items-center justify-center rounded-full bg-foreground"
				haptic={Presets.System.selection}
				onPress={close}
			>
				<AppText
					color="background"
					style={CTA}
					variant="body"
					weight="semibold"
				>
					{copy.cta}
				</AppText>
			</PressScale>
		</View>
	);
}
