import { Switch, View } from "react-native";
import { LABEL, ROW } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { a11yHidden } from "@/lib/utils";

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
	disabled?: boolean;
	a11y?: string;
}) {
	return (
		<View className={ROW}>
			<AppText
				className={cn("flex-1", LABEL)}
				variant="body"
				{...a11yHidden(true)}
			>
				{label}
			</AppText>
			<View className={disabled ? "opacity-45" : "opacity-100"}>
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
