import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { Presets } from "react-native-pulsar";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playSoftPress } from "@/lib/haptics";
import { COPY } from "../copy";
import { SESSION_FACE } from "../face/session-face";
import type { SessionFace } from "../face/use-session-face";
import { HOLD, REDUCED_MS, TS } from "../session-look";
import type { SessionClocks } from "../use-session-clocks";

export type Share = "" | "yes" | "no";
export type Hold = 0 | 1 | 2;

type Args = {
	face: SessionFace;
	clocks: SessionClocks;
	reduced: boolean;
	onShare: (contributed: boolean) => void;
};

const WARM_MS = 400;

export function useSend({ face, clocks, reduced, onShare }: Args) {
	const [share, setShare] = useState<Share>("");
	const [hold, setHold] = useState<Hold>(0);
	const holdSv = useSharedValue(0);
	const warm = useSharedValue(0);
	const gone = useSharedValue(0);
	const answered = useRef(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const clear = () => {
		for (const t of timers.current) {
			clearTimeout(t);
		}
		timers.current = [];
	};
	useEffect(() => clear, []);
	const at = (ms: number, fn: () => void) =>
		timers.current.push(setTimeout(fn, ms));
	const fade = (to: number, ms: number) =>
		withTiming(to, { duration: ms, ...PLAY_AS_CHOSEN });

	const onHold = (h: Hold) => {
		if (answered.current) {
			return;
		}
		setHold(h);
		warm.set(fade(h ? 1 : 0, WARM_MS));
		if (h === 1) {
			playSoftPress();
			face.to(SESSION_FACE.watch);
		} else if (h === 2) {
			Presets.propel();
		}
	};

	const land = () => {
		gone.set(fade(1, reduced ? REDUCED_MS : TS.slotOut));
		Presets.dewdrop();
		const landAt = reduced ? TS.reducedLand : TS.land;
		face.briefly(
			SESSION_FACE.star,
			(reduced ? TS.reducedWatch : TS.watch) - landAt,
			SESSION_FACE.watch
		);
		face.hop();
		AccessibilityInfo.announceForAccessibility(COPY.share.left);
	};

	const send = (how: "tap" | "hold") => {
		if (answered.current) {
			return;
		}
		answered.current = true;
		clear();
		setHold(0);
		holdSv.set(0);
		setShare("yes");
		onShare(true);
		if (how === "tap") {
			Presets.System.selection();
		}
		face.to(SESSION_FACE.watch);
		warm.set(fade(1, WARM_MS));
		AccessibilityInfo.announceForAccessibility(COPY.share.leaving);
		clocks.run("cs");
		at(reduced ? TS.reducedLand : TS.land, land);
	};

	const keep = () => {
		if (answered.current) {
			return;
		}
		answered.current = true;
		setShare("no");
		onShare(false);
		gone.set(fade(1, reduced ? REDUCED_MS : TS.slotOut));
		face.to(SESSION_FACE.nod);
		AccessibilityInfo.announceForAccessibility(COPY.share.kept);
	};

	const holdNow = () => {
		holdSv.set(1);
		onHold(1);
		at(HOLD.readyMs, () => {
			holdSv.set(2);
			onHold(2);
		});
	};

	const sent = (from: number) => {
		answered.current = true;
		setShare("yes");
		warm.set(1);
		gone.set(1);
		clocks.run("cs", from);
		face.to(SESSION_FACE.watch);
	};

	const kept = () => {
		answered.current = true;
		setShare("no");
		gone.set(1);
	};

	return {
		gone,
		hold,
		holdNow,
		holdSv,
		keep,
		kept,
		onHold,
		send,
		sent,
		share,
		warm,
	};
}

export type Send = ReturnType<typeof useSend>;
