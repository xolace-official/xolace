import { create } from "zustand";
import type { Gone } from "./peer-reflection-model";

type State = {
	gone: Readonly<Record<string, Gone>>;
	leave: (id: string, why: Gone) => void;
	clear: () => void;
};

export const useGoneStore = create<State>()((set) => ({
	clear: () => set({ gone: {} }),
	gone: {},
	leave: (id, why) => set((s) => ({ gone: { ...s.gone, [id]: why } })),
}));
