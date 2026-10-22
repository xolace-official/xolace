import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
    if (!reflectionId) router.back();
  }, [reflectionId, router]);

  const handleSelect = async (reason: ReportReason) => {
    if (!reflectionId || sent.current) return;
    sent.current = true;
    router.back();
    try {
      const result = await report({ reflectionId: reflectionId as Id<"reflections">, reason });
      if (result?.rateLimited) {
        toast.show({
          label: "Too many reports",
          description: "You've reported a lot recently. Try again later.",
          variant: "default",
        });
      } else if (result?.alreadyReported) {
        toast.show({
          label: "Already reported",
          description: "You've already flagged this reflection.",
          variant: "default",
        });
      } else {
        toast.show({
          label: "Report received",
          description: "Thanks. We'll review this.",
          variant: "default",
        });
        posthog.capture("peer_reflection_reported", { reason });
      }
    } catch {
      toast.show({
        label: "Something went wrong",
        description: "Try again in a moment.",
        variant: "default",
      });
    }
  };

  return (
    // Top padding clears the native grabber, which overlays the content.
    <View className="gap-1 pt-6 pb-4">
      <AppText accessibilityRole="header" className="px-5 pb-2 text-[13px] text-foreground/40">
        Why are you reporting this?
      </AppText>

      {REASONS.map(({ label, value }) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          onPress={() => handleSelect(value)}
          className="px-5 py-[13px] active:opacity-60"
        >
          <AppText className="text-base text-foreground">{label}</AppText>
        </Pressable>
      ))}

      <View className="h-px mx-5 my-1.5 bg-foreground/10" />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        className="px-5 py-[13px] active:opacity-60"
      >
        <AppText className="text-base text-foreground/40">Cancel</AppText>
      </Pressable>
    </View>
  );
};
