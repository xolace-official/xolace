/**
 * The reflections you reported or hid, for as long as the app runs: the report
 * sheet is its own route, so its answer reaches the screen through here, and a
 * card you put away stays away if the same reflection comes back on a later
 * visit. Not server truth (a report is, through `reportReflection`; a hide never
 * leaves the device) and not kept across launches.
 */
import { create } from "zustand";
import type { Gone } from "./peer-reflection-model";

type State = {
	gone: Readonly<Record<string, Gone>>;
	leave: (id: string, why: Gone) => void;
};

export const useGoneStore = create<State>()((set) => ({
	gone: {},
	leave: (id, why) => set((s) => ({ gone: { ...s.gone, [id]: why } })),
}));
