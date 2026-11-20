import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { SETUP } from "./copy";
import {
	isStepComplete,
	progressLine,
	SETUP_STEPS,
	type SetupDraft,
} from "./setup-model";

export function SetupProgress({
	draft,
	step,
}: {
	draft: SetupDraft;
	step: number;
}) {
	const line = progressLine(draft);
	return (
		<View
			accessibilityLabel={`${SETUP.stepOf(step + 1, SETUP_STEPS.length)}. ${line.text}`}
			accessible
			className="gap-2 px-6"
		>
			<View className="flex-row gap-1.5">
				{SETUP_STEPS.map((s, i) => (
					<View
						className={cn(
							"h-1.5 flex-1 rounded-full",
							s.id !== "review" && isStepComplete(s.id, draft)
								? "bg-accent"
								: i === step
									? "bg-foreground/25"
									: "bg-surface-secondary"
						)}
						key={s.id}
					/>
				))}
			</View>
			<AppText
				color={line.ready ? "successInk" : "muted"}
				variant="footnote"
				weight={line.ready ? "semibold" : "regular"}
			>
				{line.text}
			</AppText>
		</View>
	);
}
