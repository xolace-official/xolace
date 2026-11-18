import { createContext, type ReactNode, use } from "react";
import { useMoment } from "@/features/you/moments/moment/use-moment";
import type { MomentView } from "@/features/you/moments/moments-model";

export type TalkLine = { role: "person" | "companion"; text: string };

/**
 * Everything a moment reads and does. Convex fills it in the app (`MomentData`), fixtures in its
 * dev states. Undefined state means still loading; null, the id led nowhere.
 */
export type MomentScreenData = {
	state:
		| {
				moment: MomentView;
				/** A talk's thread, as it was; empty until it loads, or for anything else. */
				thread: TalkLine[];
				/** The name the companion had then, else its name now. */
				companion: string;
				/** The mirror has a voice: the play button shows. */
				audio: { ready: boolean; playing: boolean };
		  }
		| null
		| undefined;
	actions: {
		toggleAudio: () => void;
		/** Back to Reflect, to write again. */
		again: () => void;
		share: () => void;
	};
};

const Context = createContext<MomentScreenData | null>(null);

export function MomentProvider({
	value,
	children,
}: {
	value: MomentScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function MomentData({
	id,
	children,
}: {
	id: string | undefined;
	children: ReactNode;
}) {
	return <MomentProvider value={useMoment(id)}>{children}</MomentProvider>;
}

export function useMomentScreen(): MomentScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useMomentScreen outside MomentData");
	}
	return value;
}
