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

/** Sent with each Xolacer request so the server knows this build can show the date-of-birth
 * step (#716). Old binaries send nothing and are let through without one. */
export const CLIENT_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** The age gate in front of a Xolacer request (or a letter): asks for a date of birth when
 * there's none, and shows where a minor's answer leads, in its own sheet (`/age-gate`).
 * Whatever was waiting on it runs after an adult answer. */
export function useAgeGate(surface: AgeGateSurface = "xolacer_chat") {
	const status = useQuery(api.age.declarations.status)?.status;

	const open = (step: AgeGateStep, proceed: () => void) =>
		openAgeGate({ proceed, step, surface });

	/** Runs `proceed` now when nothing stands in the way, else after the gate. */
	const guard = (proceed: () => void) => {
		const step = stepForStatus(status);
		if (step) {
			open(step, proceed);
		} else {
			proceed();
		}
	};

	/** For a request the server refused on age (a status that hadn't loaded, or went stale):
	 * opens the gate with `retry` waiting, and says whether it did. */
	const handleRefusal = (error: unknown, retry: () => void) => {
		const step = stepForError(error);
		if (step) {
			open(step, retry);
		}
		return step !== null;
	};

	return { guard, handleRefusal };
}
