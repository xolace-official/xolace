import { createContext, type ReactNode, use } from "react";
import { useMoment } from "@/features/you/moments/moment/use-moment";
import type { MomentView } from "@/features/you/moments/moments-model";

export type TalkLine = { role: "person" | "companion"; text: string };

export type MomentScreenData = {
	state:
		| {
				moment: MomentView;
				thread: TalkLine[];
				companion: string;
				audio: { ready: boolean; playing: boolean };
		  }
		| null
		| undefined;
	actions: {
		toggleAudio: () => void;
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
