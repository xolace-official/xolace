import type { ImageSource } from "expo-image";
import {
	TWIG_PRESENTATION,
	type Twig,
} from "@/features/kindling/twig-presentation";

/** The announcement's six. Try-this has no pose of its own yet (#567). */
export type AnnouncementKind = Exclude<Twig["kind"], "try">;

/** All six, always: the announcement is the concept, not this session's twigs (#455). */
export const ANNOUNCEMENT_KINDS = (
	Object.keys(TWIG_PRESENTATION) as Twig["kind"][]
).filter((kind): kind is AnnouncementKind => kind !== "try");

/** Flux, one pose per twig kind (prompts: docs/kindling-flux-poses.md), in Convex storage. */
const STORAGE = "https://energetic-guineapig-283.convex.cloud/api/storage";
const BREATHING_POSE = {
	uri: `${STORAGE}/379966f6-e54e-45f9-97d1-b2897230e3b2`,
};
export const POSE: Record<Twig["kind"], ImageSource> = {
	audio: { uri: `${STORAGE}/637bf533-a584-4add-9840-6edb07f1c591` },
	breathing: BREATHING_POSE,
	bridge: { uri: `${STORAGE}/e1069c9d-e99f-46d8-b47f-49cd07e7a062` },
	music: { uri: `${STORAGE}/5e7bac04-fd9b-45dd-a053-7648a2c3f91b` },
	read: { uri: `${STORAGE}/8530a88f-37c1-45a3-ab2f-3635a4f70ce1` },
	// Borrows breathing's until try-this has a pose of its own.
	try: BREATHING_POSE,
	xolacer: { uri: `${STORAGE}/c3517525-fd5a-43f6-859f-a6744e283344` },
};

/** Transparent poses: shown whole on the circle's tint. The rest carry a scene and fill the
 * circle. */
export const CLEAN_POSES = new Set<Twig["kind"]>(["audio", "xolacer"]);

/** Ring accents, deliberately outside the theme tokens (#457) so they read the same everywhere. */
export const RING_ACCENT: Record<AnnouncementKind, string> = {
	audio: "#F4A261",
	breathing: "#7DD3C0",
	bridge: "#F2D06B",
	music: "#B48CF2",
	read: "#8CB8F2",
	xolacer: "#F28CB1",
};

/** How much of each ring is drawn. Arbitrary, no data behind it. */
export const RING_ARC: Record<AnnouncementKind, number> = {
	audio: 0.72,
	breathing: 1,
	bridge: 1,
	music: 0.45,
	read: 0.6,
	xolacer: 0.86,
};
