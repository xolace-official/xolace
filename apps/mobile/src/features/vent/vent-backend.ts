import type { SharedValue } from "react-native-reanimated";

export type VentStage = "idle" | "recording" | "processing" | "heard" | "gone";

export type VentReply = { words: string; crisis: boolean };

export type VentBackend = {
	state: {
		stage: VentStage;
		introSeen: boolean;
		capBefore: boolean;
		ceilingMs: number;
		level: SharedValue<number>;
		micOff: boolean;
		reply: VentReply | null;
		capReached: boolean;
	};
	actions: {
		understand: () => void;
		start: () => Promise<"started" | "off" | "failed">;
		recordedMs: () => number;
		stop: (atCeiling: boolean) => void;
		burnt: () => void;
		speak: () => Promise<number | null>;
		finish: () => void;
		drop: (reason: "close" | "background" | "unmounted") => void;
		close: () => void;
		leave: () => void;
		openSettings: () => void;
		support: () => void;
	};
};
