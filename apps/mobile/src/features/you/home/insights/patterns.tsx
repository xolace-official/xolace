import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { COPY } from "@/features/you/copy";
import type { PatternRow } from "@/features/you/home/you-model";
import { Surface } from "@/features/you/surface";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

export function Chips({ tags }: { tags: string[] }) {
	return (
		<>
			<AppText
				accessibilityRole="header"
				className="-mb-1 text-[13px]"
				color="muted"
				variant="footnote"
				weight="semibold"
			>
				{COPY.insights.bring}
			</AppText>
			<View className="flex-row flex-wrap gap-2">
				{tags.map((tag) => (
					<View
						className="h-8 flex-row items-center rounded-[16px] bg-surface-secondary px-3.25"
						key={tag}
					>
						<AppText
							className="text-[13.5px] capitalize"
							variant="footnote"
							weight="semibold"
						>
							{COPY.insights.chip(tag)}
						</AppText>
					</View>
				))}
			</View>
		</>
	);
}

export function Patterns({ rows }: { rows: PatternRow[] }) {
	const accent = useTokenColor("accent");
	return (
		<>
			<AppText
				accessibilityRole="header"
				className="mx-1 mt-1.5 -mb-1.5 text-[11px] uppercase tracking-[1.32px]"
				color="subtle"
				variant="caption"
				weight="semibold"
			>
				{COPY.insights.patterns}
			</AppText>
			<Surface className="px-4">
				{rows.map((row, i) => (
					<View
						accessible
						className={cn(
							"flex-row items-center gap-3.5 border-separator py-3.75",
							i > 0 ? "border-t-[0.5px]" : "border-t-0"
						)}
						key={row.text}
					>
						<View className="size-9 items-center justify-center rounded-[16px] border-continuous bg-accent/14">
							<Icon color={accent} name={row.icon} size={18} />
						</View>
						<AppText className="flex-1 text-[15px] leading-5" variant="callout">
							{row.text}
						</AppText>
					</View>
				))}
			</Surface>
		</>
	);
}
