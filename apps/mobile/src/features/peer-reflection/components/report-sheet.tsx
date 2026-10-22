import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";

type ReportReason = "offensive" | "self_harm" | "spam" | "other";

const REASONS: { label: string; value: ReportReason }[] = [
	{ label: "Offensive or hateful", value: "offensive" },
	{ label: "Self-harm or crisis content", value: "self_harm" },
	{ label: "Spam or off-topic", value: "spam" },
	{ label: "Something else", value: "other" },
];

/**
 * Native formSheet (`report-reflection` route) sized to its rows. Owns the
 * report: it closes first, then sends — the toast lands on the reflections
 * screen underneath.
 */
export const ReportSheet = () => {
	const { reflectionId } = useLocalSearchParams<{ reflectionId?: string }>();
	const router = useRouter();
	const { toast } = useToast();
	const posthog = usePostHog();
	const report = useMutation(api.reflections.reportReflection);
	// A second tap during the dismiss animation would send (and toast) twice.
	const sent = useRef(false);

	useEffect(() => {
		if (!reflectionId) {
			router.back();
		}
	}, [reflectionId, router]);

	const handleSelect = async (reason: ReportReason) => {
		if (!reflectionId || sent.current) {
			return;
		}
		sent.current = true;
		router.back();
		try {
			const result = await report({
				reason,
				reflectionId: reflectionId as Id<"reflections">,
			});
			if (result?.rateLimited) {
				toast.show({
					description: "You've reported a lot recently. Try again later.",
					label: "Too many reports",
					variant: "default",
				});
			} else if (result?.alreadyReported) {
				toast.show({
					description: "You've already flagged this reflection.",
					label: "Already reported",
					variant: "default",
				});
			} else {
				toast.show({
					description: "Thanks. We'll review this.",
					label: "Report received",
					variant: "default",
				});
				posthog.capture("peer_reflection_reported", { reason });
			}
		} catch {
			toast.show({
				description: "Try again in a moment.",
				label: "Something went wrong",
				variant: "default",
			});
		}
	};

	return (
		// Top padding clears the native grabber, which overlays the content.
		<View className="gap-1 pt-6 pb-4">
			<AppText
				accessibilityRole="header"
				className="px-5 pb-2 text-[13px] text-foreground/40"
			>
				Why are you reporting this?
			</AppText>

			{REASONS.map(({ label, value }) => (
				<Pressable
					accessibilityRole="button"
					className="px-5 py-[13px] active:opacity-60"
					key={value}
					onPress={() => handleSelect(value)}
				>
					<AppText className="text-base text-foreground">{label}</AppText>
				</Pressable>
			))}

			<View className="mx-5 my-1.5 h-px bg-foreground/10" />

			<Pressable
				accessibilityRole="button"
				className="px-5 py-[13px] active:opacity-60"
				onPress={() => router.back()}
			>
				<AppText className="text-base text-foreground/40">Cancel</AppText>
			</Pressable>
		</View>
	);
};
