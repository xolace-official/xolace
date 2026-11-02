import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import { PRESETS } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";

/** After the processing → mirror swap has settled, so the nod is seen. */
const NOD_DELAY_MS = 450;
const FACE_SIZE = 30;

/**
 * A small Xolace face by "The Mirror" label. It arrives still thinking, then gives one gentle
 * nod into the soft `nod` pose: warm, not a grin, since mirrors are often about something heavy.
 */
export const MirrorFace = () => {
	// Its blinks and breath stop under a pushed screen.
	const face = useFace(PRESETS.thinking, useIsFocused());

	useEffect(() => {
		const timer = setTimeout(() => {
			face.to(PRESETS.nod);
			face.nod();
		}, NOD_DELAY_MS);
		return () => clearTimeout(timer);
	}, [face]);

	return <XolaceFace face={face} size={FACE_SIZE} />;
};
