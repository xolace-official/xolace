import { Switch, View } from "react-native";
import { LABEL, ROW } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { a11yHidden } from "@/lib/utils";

/**
 * A card row with a switch, one VoiceOver stop.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function SwitchRow({
	label,
	value,
	onChange,
	disabled = false,
	a11y,
}: {
	label: string;
	value: boolean;
	onChange: (v: boolean) => void;
	/** Dims the row. The switch stays live on purpose: a blocked setting (notifications
	 * off in iOS Settings) still takes the tap so the screen can explain why. */
	disabled?: boolean;
	a11y?: string;
}) {
	return (
		<View className={ROW}>
			{/* One VoiceOver stop: the switch carries the label, the text is hidden. */}
			<AppText
				className={cn("flex-1", LABEL)}
				variant="body"
				{...a11yHidden(true)}
			>
				{label}
			</AppText>
			<View className={disabled ? "opacity-45" : "opacity-100"}>
				{/* Never pass `disabled` to the Switch: see the prop's comment. */}
				<Switch
					accessibilityLabel={a11y ?? label}
					ios_backgroundColorClassName="accent-foreground/16"
					onValueChange={onChange}
					trackColorOffClassName="accent-foreground/16"
					trackColorOnClassName="accent-accent"
					value={value}
				/>
			</View>
		</View>
	);
}
