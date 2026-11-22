import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { MOMENTS_COPY } from "@/features/you/moments/copy";
import type { Tone } from "@/features/you/moments/moments-model";
import { cn } from "@/lib/cn";

const LOOK: Record<Tone, { bg: string; fg: string }> = {
	direct: { bg: "bg-tone-direct/15", fg: "text-tone-direct-text" },
	gentle: { bg: "bg-tone-gentle/15", fg: "text-tone-gentle-text" },
	poetic: { bg: "bg-tone-poetic/15", fg: "text-tone-poetic-text" },
	witnessed: { bg: "bg-tone-witnessed/15", fg: "text-tone-witnessed-text" },
};

export function ToneChip({ tone }: { tone: Tone }) {
	const look = LOOK[tone];
	return (
		<View
			className={cn(
				"h-6 justify-center rounded-[12px] border-continuous px-2.25",
				look.bg
			)}
		>
			<AppText className={look.fg} variant="caption" weight="semibold">
				{MOMENTS_COPY.tones[tone]}
			</AppText>
		</View>
	);
}
