import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { TalkLine } from "@/features/you/moments/moment/moment-data";
import { cn } from "@/lib/cn";

/** A past talk's thread, read-only, as it was: the companion on the left under the name it had
 * then, you on the right (production's `TalkTranscript`, in the redesign's surfaces). */
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
						// The stored thread is append-only: a line's place is its identity.
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
