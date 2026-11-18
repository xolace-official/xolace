/**
 * Trusted Bridge's data: production's flow. The intro once (`bridgeIntroSeen`), who it's for,
 * a draft from `ai.bridge.requestBridgeDraft` (a template when it can't, saying why), the share
 * sheet, and `paths.completeStep` when it came from a path step.
 */
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
import { Share } from "react-native";
import { toast } from "@/components/shared/toast";
import type { BridgeScreenData } from "@/features/care/bridge/bridge-data";
import {
	type BridgeStep,
	canWrite,
	type DraftStatus,
	failedStatus,
	quotaHintOf,
	type Relationship,
} from "@/features/care/bridge/bridge-model";
import { COPY } from "@/features/care/bridge/copy";
import { usePaywall } from "@/features/purchases/use-paywall";
import { convexErrorCode } from "@/lib/convex-error-code";
import { useAppStore } from "@/store/store";

const home = () => router.dismissTo("/");

export function useBridge(
	sessionId: Id<"sessions">,
	stepId: Id<"path_steps"> | undefined
): BridgeScreenData {
	const posthog = usePostHog();
	const quota = useQuery(api.ai.bridge.getQuota);
	const requestDraft = useAction(api.ai.bridge.requestBridgeDraft);
	const completeStep = useMutation(api.paths.completeStep);
	const openPaywall = usePaywall((s) => s.open);
	const introSeen = useAppStore((s) => s.bridgeIntroSeen);
	const setIntroSeen = useAppStore((s) => s.setBridgeIntroSeen);

	const [step, setStep] = useState<BridgeStep>(() =>
		introSeen ? "recipient" : "intro"
	);
	const [name, setName] = useState("");
	const [relationship, setRelationship] = useState<Relationship | null>(null);
	const [addressTerm, setAddressTerm] = useState<string | null>(null);
	const [status, setStatus] = useState<DraftStatus>("idle");
	const [text, setText] = useState("");
	const [written, setWritten] = useState<string | null>(null);
	const [shared, setShared] = useState(false);
	// The newest request: Back is reachable mid-load, so an older answer is dropped.
	const requestId = useRef(0);

	const generate = async () => {
		requestId.current += 1;
		const id = requestId.current;
		setStatus("loading");
		try {
			const result = await requestDraft({
				addressTerm: addressTerm ?? undefined,
				recipientName: name.trim(),
				recipientRelationship: relationship ?? undefined,
				sessionId,
			});
			if (id !== requestId.current) {
				return;
			}
			setText(result.draft);
			setWritten(result.draft);
			setStatus("success");
		} catch (error) {
			if (id !== requestId.current) {
				return;
			}
			// Still something to send, and told why it isn't theirs yet.
			setText(COPY.draft.fallback);
			setWritten(null);
			setStatus(failedStatus(convexErrorCode(error)));
		}
	};

	const share = async () => {
		if (!text.trim()) {
			return;
		}
		let result: Awaited<ReturnType<typeof Share.share>>;
		try {
			result = await Share.share({ message: text });
		} catch {
			return; // the sheet was dismissed
		}
		// Only a finished share reveals Done (Android always reports sharedAction).
		if (result.action !== Share.sharedAction) {
			return;
		}
		posthog.capture("bridge_shared", { recipient_relationship: relationship });
		if (stepId) {
			try {
				await completeStep({ stepId });
			} catch {
				toast(COPY.toast.progress);
				return;
			}
		}
		setShared(true);
	};

	return {
		actions: {
			back: () => {
				setShared(false);
				setStep("recipient");
			},
			begin: () => {
				setIntroSeen(true);
				setStep("recipient");
			},
			complete: () => {
				posthog.capture("bridge_completed", {
					recipient_relationship: relationship,
				});
				home();
			},
			dismiss: () => {
				posthog.capture("bridge_dismissed", {
					step: step === "draft" ? "draft" : "recipient",
				});
				home();
			},
			getPlus: () => openPaywall("bridge_draft"),
			selectRelationship: (next) => {
				setRelationship((prev) => (prev === next ? null : next));
				setAddressTerm(null); // the terms differ per relationship
			},
			setAddressTerm: (term) =>
				setAddressTerm(term && term.length > 0 ? term : null),
			setDraft: (next) => {
				setText(next);
				setWritten(null);
			},
			setName,
			share: () => {
				share().catch(() => undefined);
			},
			write: () => {
				if (!canWrite(name)) {
					return;
				}
				posthog.capture("bridge_opened", {
					recipient_relationship: relationship,
				});
				setShared(false); // a fresh draft, not shared yet
				setStep("draft");
				generate().catch(() => undefined);
			},
		},
		state: {
			draft: { shared, status, text, written },
			quota: quotaHintOf(quota),
			recipient: { addressTerm, name, relationship },
			step,
		},
	};
}
