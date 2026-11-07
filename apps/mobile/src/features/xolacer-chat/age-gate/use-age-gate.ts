import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Constants from "expo-constants";
import { useToast } from "heroui-native";
import { useRef, useState } from "react";
import {
	AGE_PROMPT_VERSION,
	type AgeGateStep,
	stepForError,
	stepForStatus,
} from "./age-gate-step";

/** Sent with each Xolacer request so the server knows this build can show the date-of-birth
 * step (#716). Old binaries send nothing and are let through without one. */
export const CLIENT_VERSION = Constants.expoConfig?.version ?? "0.0.0";

const PLATFORM = process.env.EXPO_OS === "android" ? "android" : "ios";

/** The age gate in front of a Xolacer request: asks for a date of birth when there's none, and
 * shows where a minor's answer leads. Whatever was waiting on it runs after an adult answer. */
export function useAgeGate() {
	const { toast } = useToast();
	const status = useQuery(api.age.declarations.status)?.status;
	const declare = useMutation(api.age.declarations.declare);
	const [step, setStep] = useState<AgeGateStep | null>(null);
	const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const pending = useRef<(() => void) | null>(null);

	const open = (next: AgeGateStep, then: () => void) => {
		pending.current = then;
		setStep(next);
	};

	/** Runs `proceed` now when nothing stands in the way, else after the gate. */
	const guard = (proceed: () => void) => {
		const next = stepForStatus(status);
		if (next) {
			open(next, proceed);
		} else {
			proceed();
		}
	};

	/** For a request the server refused on age (a status that hadn't loaded, or went stale):
	 * opens the gate with `retry` waiting, and says whether it did. */
	const handleRefusal = (error: unknown, retry: () => void) => {
		const next = stepForError(error);
		if (next) {
			open(next, retry);
		}
		return next !== null;
	};

	const close = () => {
		if (saving) {
			return;
		}
		pending.current = null;
		setStep(null);
	};

	const submit = () => {
		if (!dateOfBirth || saving) {
			return;
		}
		setSaving(true);
		declare({
			appVersion: CLIENT_VERSION,
			dateOfBirth,
			platform: PLATFORM,
			promptVersion: AGE_PROMPT_VERSION,
			surface: "xolacer_chat",
		})
			.then((result) => {
				const next = stepForStatus(result.status);
				if (next) {
					setStep(next);
					return;
				}
				const proceed = pending.current;
				pending.current = null;
				setStep(null);
				proceed?.();
			})
			.catch(() => {
				toast.show({ label: "Couldn't save that date. Try again." });
			})
			.finally(() => setSaving(false));
	};

	return {
		close,
		dateOfBirth,
		decline: () => setStep("declined"),
		guard,
		handleRefusal,
		saving,
		setDateOfBirth,
		step,
		submit,
	};
}

export type AgeGate = ReturnType<typeof useAgeGate>;
