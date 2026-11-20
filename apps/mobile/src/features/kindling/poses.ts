const STORAGE = "https://energetic-guineapig-283.convex.cloud/api/storage";
const BREATHING_POSE = `${STORAGE}/379966f6-e54e-45f9-97d1-b2897230e3b2`;
const POSES: Partial<Record<string, string>> = {
	audio: `${STORAGE}/637bf533-a584-4add-9840-6edb07f1c591`,
	breathing: BREATHING_POSE,
	bridge: `${STORAGE}/e1069c9d-e99f-46d8-b47f-49cd07e7a062`,
	music: `${STORAGE}/5e7bac04-fd9b-45dd-a053-7648a2c3f91b`,
	read: `${STORAGE}/8530a88f-37c1-45a3-ab2f-3635a4f70ce1`,
	try: BREATHING_POSE,
	xolacer: `${STORAGE}/c3517525-fd5a-43f6-859f-a6744e283344`,
};

export const poseOf = (kind: string): string => POSES[kind] ?? BREATHING_POSE;

export const isCleanPose = (kind: string) =>
	kind === "audio" || kind === "xolacer";

export const CAMPFIRE_STILL = require("@/assets/images/flux/flux-campfire-still.webp");
export const CAMPFIRE_LOOP = require("@/assets/images/flux/flux-campfire-loop.webp");
