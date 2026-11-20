import {
	MAX_SPECIALTIES,
	SPECIALTIES,
} from "@xolace/backend/convex/lib/specialties";
import { View } from "react-native";
import { Footnote, SectionTitle } from "@/components/settings-kit/parts";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";

const CHECK = { android: "check", ios: "checkmark" } as const;
const CHECK_GLYPH = 11;

/** The fixed taxonomy, capped at four; past the cap unpicked chips dim rather than disappear. */
export function SpecialtyChips({
	selected,
	onToggle,
}: {
	selected: string[];
	onToggle: (slug: string) => void;
}) {
	const atCap = selected.length >= MAX_SPECIALTIES;
	return (
		<View className="mt-section">
			<SectionTitle aside={`${selected.length} / ${MAX_SPECIALTIES}`}>
				What you're here for
			</SectionTitle>
			<View className="flex-row flex-wrap gap-2 px-gutter">
				{SPECIALTIES.map((specialty) => {
					const checked = selected.includes(specialty.slug);
					return (
						<Chip
							checked={checked}
							disabled={atCap && !checked}
							key={specialty.slug}
							label={specialty.pickerLabel}
							onPress={() => onToggle(specialty.slug)}
						/>
					);
				})}
			</View>
			<Footnote>
				{atCap
					? "Four is the limit — deselect one to swap."
					: "Pick up to four. People can filter the roster by these."}
			</Footnote>
		</View>
	);
}

function Chip({
	label,
	checked,
	disabled,
	onPress,
}: {
	label: string;
	checked: boolean;
	disabled: boolean;
	onPress: () => void;
}) {
	const [background] = useTokenColors(["background"]);
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="checkbox"
			accessibilityState={{ checked, disabled }}
			className={cn(
				"h-9 flex-row items-center gap-1.5 rounded-[18px] border-continuous px-[15px]",
				checked ? "bg-foreground" : "border border-separator bg-surface",
				disabled && "opacity-40"
			)}
			disabled={disabled}
			haptic={playSoftPress}
			onPress={onPress}
		>
			<AppText
				color={checked ? "background" : "foreground"}
				variant="callout"
				weight="medium"
			>
				{label}
			</AppText>
			{checked ? (
				<Icon
					color={background}
					name={CHECK}
					size={CHECK_GLYPH}
					weight="bold"
				/>
			) : null}
		</PressScale>
	);
}
