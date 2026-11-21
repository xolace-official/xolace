import { router } from "expo-router";
import { create } from "zustand";
import type { AgeGateStep, AgeGateSurface } from "./age-gate-step";

export type AgeGateRequest = {
	step: AgeGateStep;
	surface: AgeGateSurface;
	proceed: () => void;
};

export const useAgeGateRequest = create<{ request: AgeGateRequest | null }>(
	() => ({ request: null })
);

export function openAgeGate(request: AgeGateRequest): void {
	useAgeGateRequest.setState({ request });
	router.push("/age-gate");
}

export function clearAgeGate(): void {
	useAgeGateRequest.setState({ request: null });
}
