import { View } from "react-native";
import type { IntakeV2Step } from "@/features/intake/v2/machine";
import { cn } from "@/lib/utils";

const SEGMENTS = [1, 2, 3] as const;

/** Answer, what was heard, the name: the three stops the user sees. */
const segmentOf = (step: IntakeV2Step): number => {
	if (step === "heard") {
		return 2;
	}
	return step === "name" || step === "done" ? 3 : 1;
};

export function IntakeV2Progress({ step }: { step: IntakeV2Step }) {
	const at = segmentOf(step);
	return (
		<View
			accessibilityLabel={`Step ${at} of ${SEGMENTS.length}`}
			className="flex-row gap-1.5 px-6 pt-3"
		>
			{SEGMENTS.map((i) => (
				<View
					className={cn(
						"h-1 flex-1 rounded-full",
						i <= at ? "bg-ember" : "bg-surface-secondary"
					)}
					key={i}
				/>
			))}
		</View>
	);
}
