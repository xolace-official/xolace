import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { Part } from "@/features/you/home/steadiness/steadiness-model";
import { cn } from "@/lib/cn";

const DOT: Record<Part["tone"], string> = {
	accent: "bg-accent",
	ember: "bg-ember",
	muted: "bg-subtle opacity-60",
};
const WORD = { accent: "accent", ember: "emberInk", muted: "muted" } as const;

/** One part of life over a hairline: its dot, its name and the word for it, read as one. */
export function PartRow({ part }: { part: Part }) {
	return (
		<View
			accessibilityLabel={`${part.name}, ${part.word}`}
			accessible
			className="flex-row items-center gap-2.5 border-separator border-t-[0.5px] py-2.25"
		>
			<View className={cn("size-2 rounded-full", DOT[part.tone])} />
			<AppText className="flex-1 text-[14px]" variant="callout" weight="medium">
				{part.name}
			</AppText>
			<AppText
				className="text-[13px]"
				color={WORD[part.tone]}
				variant="footnote"
				weight={part.tone === "muted" ? undefined : "semibold"}
			>
				{part.word}
			</AppText>
		</View>
	);
}
