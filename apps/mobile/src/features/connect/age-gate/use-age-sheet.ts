import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { goBack } from "@/components/shared/back-button";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import type { AgeSheetScreenData } from "./age-gate-data";
import {
	AGE_PROMPT_VERSIONS,
	type AgeGateStep,
	stepForStatus,
} from "./age-gate-step";
import { clearAgeGate, useAgeGateRequest } from "./age-gate-store";
import { AGE } from "./copy";
import { CLIENT_VERSION } from "./use-age-gate";

const PLATFORM = process.env.EXPO_OS === "android" ? "android" : "ios";

/** The sheet on the waiting request: declares the date, then closes and carries the request on
 * (an adult), or shows where the answer leads. Closing it any way drops the request. */
export function useAgeSheet(): AgeSheetScreenData {
	// Read once: the store is cleared when the sheet closes, the request stays this sheet's.
	const [request] = useState(() => useAgeGateRequest.getState().request);
	const declare = useMutation(api.age.declarations.declare);
	const [step, setStep] = useState<AgeGateStep>(request?.step ?? "ask");
	const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const surface = request?.surface ?? "xolacer_chat";

	// Swiped down, OK, or a way on: nothing is left waiting.
	useEffect(() => clearAgeGate, []);

	const submit = () => {
		if (!dateOfBirth || saving) {
			return;
		}
		playSoftPress();
		setSaving(true);
		declare({
			appVersion: CLIENT_VERSION,
			dateOfBirth,
			platform: PLATFORM,
			promptVersion: AGE_PROMPT_VERSIONS[surface],
			surface,
		})
			.then((result) => {
				const next = stepForStatus(result.status);
				if (next) {
					setStep(next);
					return;
				}
				const proceed = request?.proceed;
				clearAgeGate();
				goBack();
				proceed?.();
			})
			.catch(() => toast(AGE.failed, { variant: "danger" }))
			.finally(() => setSaving(false));
	};

	return {
		actions: {
			close: goBack,
			decline: () => setStep("declined"),
			go: (href) => {
				goBack();
				router.push(href);
			},
			setDateOfBirth,
			submit,
		},
		state: { dateOfBirth, saving, step, surface },
	};
}
