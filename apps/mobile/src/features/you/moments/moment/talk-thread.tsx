import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { TalkLine } from "@/features/you/moments/moment/moment-data";
import { cn } from "@/lib/cn";

export function TalkThread({
	lines,
	name,
}: {
	lines: TalkLine[];
	name: string;
}) {
	return (
		<View className="gap-2.5">
			{lines.map((line, i) => {
				const mine = line.role === "person";
				return (
					<View
						className={cn(
							"max-w-[85%] gap-1 rounded-[20px] border-continuous px-4 py-3",
							mine
								? "self-end bg-accent-wash"
								: "self-start bg-surface-secondary"
						)}
						key={i}
					>
						{mine ? null : (
							<AppText color="accentInk" variant="caption" weight="semibold">
								{name}
							</AppText>
						)}
						<AppText className="leading-6" selectable variant="subhead">
							{line.text || "…"}
						</AppText>
					</View>
				);
			})}
		</View>
	);
}
