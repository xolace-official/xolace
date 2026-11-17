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

/**
 * Production's report (`reflections.reportReflection`), unchanged: the sheet
 * closes first, then the reason is sent, so the toast lands on the screen
 * underneath. fix: production left a reported card on screen; here it folds
 * away once the report is in (or was already), no sooner than 380 ms after the
 * pick, while its star goes out.
 */
export function useReportSheetData(): ReportSheet {
	const { reflectionId } = useLocalSearchParams<{ reflectionId?: string }>();
	const router = useRouter();
	const posthog = usePostHog();
	const report = useMutation(api.reflections.reportReflection);
	const leave = useGoneStore((s) => s.leave);
	// A second tap during the dismiss animation would send (and toast) twice.
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
		// The sheet is gone by the time the answer comes, so this timer isn't
		// the sheet's: it only folds the card and shows the toast.
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
