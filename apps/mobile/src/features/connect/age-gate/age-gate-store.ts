import { router } from "expo-router";
import { create } from "zustand";
import type { AgeGateStep, AgeGateSurface } from "./age-gate-step";

/** What the age gate's sheet opens on: the step, who's asking, and what runs after an adult
 * answer. The sheet is its own route (`/age-gate`), so the request waits here. */
export type AgeGateRequest = {
	step: AgeGateStep;
	surface: AgeGateSurface;
	proceed: () => void;
};

export const useAgeGateRequest = create<{ request: AgeGateRequest | null }>(
	() => ({ request: null })
);

/** Opens the sheet over whatever is in front, native sheets included. */
export function openAgeGate(request: AgeGateRequest): void {
	useAgeGateRequest.setState({ request });
	router.push("/age-gate");
}

/** The sheet closed: whatever was waiting on it is dropped. */
export function clearAgeGate(): void {
	useAgeGateRequest.setState({ request: null });
}
