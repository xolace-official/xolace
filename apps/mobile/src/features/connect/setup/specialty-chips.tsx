import { SPECIALTIES } from "@xolace/backend/convex/lib/specialties";
import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { SETUP } from "./copy";
import { MAX_SPECIALTIES } from "./setup-model";

const CHECK = { android: "check", ios: "checkmark" } as const;

export function SpecialtyChips({
	picked,
	onToggle,
}: {
	picked: readonly string[];
	onToggle: (slug: string) => void;
}) {
	const background = useTokenColor("background");
	const full = picked.length >= MAX_SPECIALTIES;
	return (
		<View>
			<View className="flex-row flex-wrap gap-2">
				{SPECIALTIES.map((s) => {
					const on = picked.includes(s.slug);
					const off = full && !on;
					return (
						<PressScale
							accessibilityLabel={s.pickerLabel}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: on, disabled: off }}
							className={cn(
								"h-9.5 flex-row items-center gap-1.5 rounded-[19px] px-3.5",
								on ? "bg-foreground" : "bg-surface-secondary",
								off && "opacity-40"
							)}
							disabled={off}
							haptic={off ? undefined : Presets.System.selection}
							key={s.slug}
							onPress={() => onToggle(s.slug)}
						>
							{on ? (
								<Icon color={background} name={CHECK} size={12} weight="bold" />
							) : null}
							<AppText
								className="text-[14.5px]"
								color={on ? "background" : "foreground"}
								variant="callout"
								weight="semibold"
							>
								{s.pickerLabel}
							</AppText>
						</PressScale>
					);
				})}
			</View>
			<View className="mt-4 flex-row justify-between gap-3">
				{full ? (
					<AppText
						accessibilityLiveRegion="polite"
						className="flex-1"
						color="muted"
						variant="footnote"
					>
						{SETUP.spec.full}
					</AppText>
				) : (
					<View className="flex-1" />
				)}
				<AppText
					color={full ? "emberInk" : "muted"}
					variant="footnote"
					weight="semibold"
				>
					{`${picked.length} / ${MAX_SPECIALTIES}`}
				</AppText>
			</View>
		</View>
	);
}
