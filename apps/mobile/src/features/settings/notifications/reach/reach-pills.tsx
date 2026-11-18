import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { REACH, type Reach } from "@/features/settings/notifications/copy";
import { cn } from "@/lib/cn";
import { tap } from "@/lib/haptics";

/** How I reach out as three pills filling the width (board `.tones`), 40 tall; chosen = ink. */
export function ReachPills({
	value,
	onPick,
}: {
	value: Reach;
	onPick: (reach: Reach) => void;
}) {
	return (
		<View accessibilityRole="radiogroup" className="flex-row gap-1.5 px-4">
			{REACH.map((r) => {
				const on = r.id === value;
				return (
					<Pressable
						accessibilityLabel={r.label}
						accessibilityRole="radio"
						accessibilityState={{ checked: on }}
						className={cn(
							"h-10 flex-1 items-center justify-center rounded-full border-separator",
							on ? "border-0 bg-foreground" : "border bg-surface"
						)}
						key={r.id}
						onPress={() => {
							if (on) {
								return;
							}
							tap();
							onPick(r.id);
						}}
					>
						<AppText
							className={cn(
								"text-[15px] leading-5",
								on ? "text-background" : "text-foreground"
							)}
							variant="body"
							weight="medium"
						>
							{r.label}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}
