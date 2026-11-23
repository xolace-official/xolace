import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { useTokenColors } from "@/lib/use-token-color";
import type { Door } from "../today-model";
import { DOOR_LOOK } from "./door-look";
import { hintParts } from "./hero-model";

const CHIP = 18;
const ICON = 11;

/**
 * "Hold the card for Talk, Vent or Sit with this", with each door's word
 * wearing the icon its tile shows, so the hint reads at a glance.
 */
export function DoorsHint({
	doors,
	label,
	hidden,
}: {
	doors: readonly Door[];
	label: string;
	hidden: boolean;
}) {
	const inks = useTokenColors(doors.map((d) => DOOR_LOOK[d].ink));
	const parts = hintParts(doors);
	return (
		<View
			accessibilityElementsHidden={hidden}
			accessibilityLabel={label}
			accessible
			className={`flex-row flex-wrap items-center justify-center gap-x-1 gap-y-1${hidden ? "opacity-0" : ""}`}
			importantForAccessibility={hidden ? "no-hide-descendants" : "yes"}
		>
			{parts.map((part) =>
				part.kind === "words" ? (
					<AppText color="muted" key={part.text} variant="footnote">
						{part.text}
					</AppText>
				) : (
					<View className="flex-row items-center gap-1" key={part.door}>
						<View
							className={`items-center justify-center rounded-full ${DOOR_LOOK[part.door].tile}`}
							style={{ height: CHIP, width: CHIP }}
						>
							<Icon
								color={inks[doors.indexOf(part.door)] ?? "transparent"}
								name={DOOR_LOOK[part.door].icon}
								size={ICON}
								weight="semibold"
							/>
						</View>
						<AppText color="muted" variant="footnote">
							{part.label}
							{part.trail}
						</AppText>
					</View>
				)
			)}
		</View>
	);
}
