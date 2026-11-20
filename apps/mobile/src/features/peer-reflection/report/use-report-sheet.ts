import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { toast } from "@/components/shared/toast";
import type { ReportReason } from "../copy";
import { useGoneStore } from "../gone-store";
import { outcomeOf, type ReportAnswer, settleIn } from "./report-outcome";
import type { ReportSheet } from "./report-sheet-data";

export function useReportSheetData(): ReportSheet {
	const { reflectionId } = useLocalSearchParams<{ reflectionId?: string }>();
	const router = useRouter();
	const posthog = usePostHog();
	const report = useMutation(api.reflections.reportReflection);
	const leave = useGoneStore((s) => s.leave);
	const sent = useRef(false);

	useEffect(() => {
		if (!reflectionId) {
			router.back();
		}
	}, [reflectionId, router]);

	const send = async (id: string, reason: ReportReason) => {
		const pickedAt = Date.now();
		let answer: ReportAnswer;
		try {
			answer = await report({
				reason,
				reflectionId: id as Id<"reflections">,
			});
		} catch {
			answer = "failed";
		}
		const { fold, toast: message, track } = outcomeOf(answer);
		if (track) {
			posthog.capture("peer_reflection_reported", { reason });
		}
		setTimeout(
			() => {
				if (fold) {
					leave(id, "reported");
				}
				toast(message);
			},
			settleIn(pickedAt, Date.now())
		);
	};

	return {
		actions: {
			cancel: () => router.back(),
			pick: (reason) => {
				if (!reflectionId || sent.current) {
					return;
				}
				sent.current = true;
				router.back();
				send(reflectionId, reason);
			},
		},
	};
}
