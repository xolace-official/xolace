import { router } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { TalkStatus } from "../talk-model";
import type { Presence } from "../use-talk";
import type { Turn } from "../use-thread";
import { PACE, SCRIPT, said, TALK_LEFT_S, WEEK } from "./fixtures";
import { useSimulatedLevel } from "./use-simulated-level";

const BURSTS = [3, 2, 4] as const;
const S = 1000;

export type Seed = {
	shown: number;
	presence?: Presence;
	holdMs?: number;
	late?: boolean;
};

const IDLE: TalkStatus = {
	connected: false,
	presence: "Connecting…",
	started: false,
	wasLive: false,
};
const LIVE: TalkStatus = {
	connected: true,
	presence: "Listening",
	started: true,
	wasLive: true,
};

export function useScriptedTalk(seed: Seed | undefined, week: number) {
	const [status, setStatus] = useState<TalkStatus>(
		seed ? { ...LIVE, presence: seed.presence ?? "Listening" } : IDLE
	);
	const [turns, setTurns] = useState<Turn[]>(() => said(seed?.shown ?? 0));
	const [muted, setMuted] = useState(false);
	const [speaking, setSpeaking] = useState(false);
	const [endsAt, setEndsAt] = useState(() =>
		seed
			? Date.now() + (seed.late ? TALK_LEFT_S.late : TALK_LEFT_S.mid) * S
			: null
	);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const nextId = useRef(seed?.shown ?? 0);
	const nextLine = useRef(seed?.shown ?? 0);
	const at = (ms: number, fn: () => void) => {
		timers.current.push(setTimeout(fn, ms));
	};
	const clear = () => {
		for (const t of timers.current) {
			clearTimeout(t);
		}
		timers.current = [];
	};
	const presence = (p: Presence) => setStatus((s) => ({ ...s, presence: p }));

	const say = (i: number, until: number) => {
		const line = SCRIPT[i];
		if (!line || i >= until) {
			presence("Listening");
			return;
		}
		nextLine.current = i + 1;
		const id = nextId.current++;
		const words = line.text.split(" ");
		if (line.speaker === "person") {
			presence("Listening");
			setSpeaking(true);
			const end = words.length * PACE.personWordMs;
			at(end, () => {
				setSpeaking(false);
				setTurns((ts) => [
					...ts,
					{ id, speaker: "person", text: line.text, via: "voice" },
				]);
				presence("Thinking…");
			});
			at(end + PACE.thinkMs, () => say(i + 1, until));
			return;
		}
		setTurns((ts) => [
			...ts,
			{ id, live: true, speaker: "companion", text: "", via: "voice" },
		]);
		presence("Speaking");
		const write = (n: number, live: boolean) =>
			setTurns((ts) =>
				ts.map((t) =>
					t.id === id ? { ...t, live, text: words.slice(0, n).join(" ") } : t
				)
			);
		let k = 0;
		for (let b = 0; k < words.length; b++) {
			const n = Math.min(words.length, k + (BURSTS[b % BURSTS.length] ?? 1));
			at((k + 1) * PACE.companionWordMs, () => write(n, true));
			k = n;
		}
		const end = (words.length + 1) * PACE.companionWordMs;
		at(end, () => write(words.length, false));
		at(end + PACE.listenAfterMs, () => presence("Listening"));
		at(end + PACE.nextAfterMs, () => say(i + 1, until));
	};

	const hold = useEffectEvent(() => {
		if (seed?.holdMs) {
			at(seed.holdMs, () => presence("Listening"));
		}
	});
	const stop = useEffectEvent(() => clear());
	useEffect(() => {
		hold();
		return () => stop();
	}, []);

	const level = useSimulatedLevel(
		status.connected && status.presence === "Listening" && !muted,
		speaking
	);

	return {
		begin() {
			clear();
			setStatus({ ...IDLE, started: true });
			at(PACE.connectMs, () => {
				setStatus(LIVE);
				setEndsAt(Date.now() + Math.min(week, WEEK.full) * S);
				say(0, PACE.livePlays);
			});
		},
		end() {
			clear();
			setSpeaking(false);
			setStatus((s) => ({ ...s, presence: "Ending…" }));
			at(PACE.endMs, () => router.back());
		},
		endsAt: status.connected ? endsAt : null,
		level,
		live: status.connected && status.presence !== "Ending…",
		muted,
		send(text: string) {
			const line = text.trim();
			if (!(line && status.connected)) {
				return;
			}
			clear();
			setTurns((ts) => [
				...ts,
				{ id: nextId.current++, speaker: "person", text: line, via: "text" },
			]);
			presence("Thinking…");
			const k = SCRIPT.findIndex(
				(l, i) => i >= nextLine.current && l.speaker === "companion"
			);
			at(PACE.thinkMs, () => (k < 0 ? presence("Listening") : say(k, k + 1)));
		},
		status:
			muted && status.presence === "Listening"
				? { ...status, presence: "Mic off" as const }
				: status,
		toggleMic: () => setMuted((m) => !m),
		turns,
	};
}
