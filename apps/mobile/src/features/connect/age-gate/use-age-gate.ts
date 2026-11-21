import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import Constants from "expo-constants";
import {
	type AgeGateStep,
	type AgeGateSurface,
	stepForError,
	stepForStatus,
} from "./age-gate-step";
import { openAgeGate } from "./age-gate-store";

export const CLIENT_VERSION = Constants.expoConfig?.version ?? "0.0.0";

export function useAgeGate(surface: AgeGateSurface = "xolacer_chat") {
	const status = useQuery(api.age.declarations.status)?.status;

	const open = (step: AgeGateStep, proceed: () => void) =>
		openAgeGate({ proceed, step, surface });

	const guard = (proceed: () => void) => {
		const step = stepForStatus(status);
		if (step) {
			open(step, proceed);
		} else {
			proceed();
		}
	};

	const handleRefusal = (error: unknown, retry: () => void) => {
		const step = stepForError(error);
		if (step) {
			open(step, retry);
		}
		return step !== null;
	};

	return { guard, handleRefusal };
}
