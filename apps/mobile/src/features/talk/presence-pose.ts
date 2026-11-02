// How the companion holds itself for what the talk is doing.

import type { Presence } from "@/features/talk/use-talk";
import { NEUTRAL, type Pose, PRESETS } from "@/features/xolace-face/pose";

const MIC_OFF: Pose = { ...NEUTRAL, eyeOpen: 0.7 };

const POSES: Record<Presence, Pose> = {
	"Connecting…": NEUTRAL,
	"Ending…": PRESETS.waiting,
	Listening: PRESETS.attentive,
	"Mic off": MIC_OFF,
	Speaking: PRESETS.speaking,
	"Thinking…": PRESETS.thinking,
};

export const poseForPresence = (presence: Presence): Pose => POSES[presence];
