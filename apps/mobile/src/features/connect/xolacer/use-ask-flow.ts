import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { toast } from "@/components/shared/toast";
import { posthog } from "@/config/posthog";
import { playSoftPress } from "@/lib/haptics";
import { useSingleFlight } from "@/lib/use-single-flight";
import { useAppStore } from "@/store/store";
import { CLIENT_VERSION, useAgeGate } from "../age-gate/use-age-gate";
import { chatLimitError, declineCooldownNote } from "../chat-rules";
import { PROFILE } from "./copy";

const PENDING_CAP = 2;
const SEEKER_OPEN_CAP = 3;

export type PrimerMode = "gate" | "reference" | null;

export function useAskFlow({
	xolacerProfileId,
	displayName,
	stepId,
}: {
	xolacerProfileId: Id<"emotional_profiles">;
	displayName: string;
	stepId?: Id<"path_steps">;
}) {
	const router = useRouter();
	const requestConversation = useMutation(api.xolacerChat.requestConversation);
	const completeStep = useMutation(api.paths.completeStep);
	const primerSeen = useAppStore((s) => s.xolacerPrimerSeen);
	const setPrimerSeen = useAppStore((s) => s.setXolacerPrimerSeen);
	const [primerMode, setPrimerMode] = useState<PrimerMode>(null);
	const ageGate = useAgeGate();
	const sending = useSingleFlight();

	const openThread = (conversationId: string) =>
		router.replace(`/chat/${conversationId}`);

	const sendRequest = (fromGate: boolean) => {
		void sending.run(() =>
			requestConversation({ clientVersion: CLIENT_VERSION, xolacerProfileId })
				.then((conversationId) => {
					if (fromGate) {
						setPrimerSeen(true);
						posthog.capture("xolacer_primer_resolved", { outcome: "sent" });
					}
					setPrimerMode(null);
					if (stepId) {
						completeStep({ stepId }).catch(() => {});
					}
					openThread(conversationId);
				})
				.catch((error: unknown) => {
					if (ageGate.handleRefusal(error, () => sendRequest(fromGate))) {
						setPrimerMode(null);
						return;
					}
					const data = chatLimitError(error);
					toast(
						data?.code === "decline_cooldown" && data.until
							? declineCooldownNote(displayName, data.until)
							: data?.code === "pending_request_limit"
								? PROFILE.toast.pendingLimit(data.max ?? PENDING_CAP)
								: data?.code === "open_conversation_limit"
									? PROFILE.toast.openLimit(data.max ?? SEEKER_OPEN_CAP)
									: PROFILE.toast.notTaking(displayName),
						{ variant: "warning" }
					);
				})
		);
	};

	const handleAsk = () => {
		playSoftPress();
		ageGate.guard(() => {
			if (primerSeen) {
				sendRequest(false);
				return;
			}
			posthog.capture("xolacer_primer_shown");
			setPrimerMode("gate");
		});
	};

	const handlePrimerConfirm = () => {
		playSoftPress();
		sendRequest(true);
	};

	const handlePrimerClose = () => {
		if (sending.isBusy()) {
			return;
		}
		if (primerMode === "gate") {
			posthog.capture("xolacer_primer_resolved", { outcome: "dismissed" });
		}
		setPrimerMode(null);
	};

	const openPrimerReference = () => {
		playSoftPress();
		setPrimerMode("reference");
	};

	return {
		handleAsk,
		handlePrimerClose,
		handlePrimerConfirm,
		openPrimerReference,
		openThread,
		primerMode,
		sending: sending.busy,
	};
}
