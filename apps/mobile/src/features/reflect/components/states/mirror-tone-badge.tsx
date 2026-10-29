import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { MirrorTone } from "@/features/reflect/hooks/use-mirror-settings";

const TONE_BADGE: Partial<Record<string, { text: string; border: string }>> = {
	direct: { border: "border-tone-direct/40", text: "text-tone-direct" },
	gentle: { border: "border-tone-gentle/40", text: "text-tone-gentle" },
	poetic: { border: "border-tone-poetic/40", text: "text-tone-poetic" },
	witnessed: {
		border: "border-tone-witnessed/40",
		text: "text-tone-witnessed",
	},
};
const FALLBACK = { border: "border-foreground/20", text: "text-foreground/40" };

/** Renders nothing for the adaptive tone: there's no named tone to show. */
export const MirrorToneBadge = ({
	toneUsed,
}: {
	toneUsed: MirrorTone | null;
}) => {
	if (toneUsed == null || toneUsed === "adaptive") {
		return null;
	}

	const style = TONE_BADGE[toneUsed] ?? FALLBACK;
	const label = toneUsed.charAt(0).toUpperCase() + toneUsed.slice(1);

	return (
		<View className="mb-3 flex-row">
			<View className={`rounded-full border px-2.5 py-0.5 ${style.border}`}>
				<AppText className={`text-xs ${style.text}`}>{label}</AppText>
			</View>
		</View>
	);
};
