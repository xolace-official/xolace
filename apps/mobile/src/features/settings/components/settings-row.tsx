import { SymbolView } from "expo-symbols";
import { Separator, Switch, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress, playTextureSelect } from "@/src/lib/haptics";
import { cn } from "@/src/lib/utils";

const CHEVRON_NAME = {
	android: "chevron_right",
	ios: "chevron.right",
	web: "chevron_right",
} as const;

const ANDROID_RIPPLE = { color: "rgba(255,255,255,0.05)" };

type BaseProps = {
	label: string;
	icon?: ReactNode;
	danger?: boolean;
	isLast?: boolean;
	className?: string;
};

type ValueProps = BaseProps & {
	variant: "value";
	value: string;
	valueIcon?: ReactNode;
	onPress?: () => void;
};

type ToggleProps = BaseProps & {
	variant: "toggle";
	isSelected: boolean;
	onToggle: (value: boolean) => void;
};

type ChevronProps = BaseProps & {
	variant: "chevron";
	onPress: () => void;
};

type ActionProps = BaseProps & {
	variant: "action";
	onPress: () => void;
};

type NavProps = BaseProps & {
	variant: "nav";
	value?: string;
	onPress: () => void;
};

export type SettingsRowProps =
	| ValueProps
	| ToggleProps
	| ChevronProps
	| ActionProps
	| NavProps;

/**
 * A single settings row supporting four display variants:
 * - `value`   — label on the left, muted text value on the right (optionally tappable)
 * - `toggle`  — label on the left, animated Switch on the right
 * - `chevron` — label on the left, chevron arrow on the right (always tappable)
 * - `action`  — full-width pressable label (e.g. "Log out")
 *
 * Pass `isLast` to suppress the bottom separator on the final row of a section.
 * Pass `danger` to render the label in the danger/error color.
 */
export const SettingsRow = (props: SettingsRowProps) => {
	const { label, icon, danger = false, isLast = false, className } = props;
	const mutedColor = useThemeColor("muted") as string;

	const labelEl = (
		<View className="flex-1 flex-row items-center gap-3 pr-3">
			{icon && <View className="opacity-85">{icon}</View>}
			<AppText
				className={cn("text-base", danger ? "text-danger" : "text-foreground")}
			>
				{label}
			</AppText>
		</View>
	);

	const renderTrailing = () => {
		if (props.variant === "value") {
			return (
				<View className="flex-row items-center gap-2">
					{props.valueIcon}
					<AppText className="text-base text-foreground/50">
						{props.value}
					</AppText>
				</View>
			);
		}

		if (props.variant === "toggle") {
			// On and off are deliberately distinguishable: a toggle that feels
			// identical in both directions tells you it moved but not where it landed.
			return (
				<Switch
					accessibilityLabel={label}
					isSelected={props.isSelected}
					onSelectedChange={(value) => {
						if (value) {
							playTextureSelect();
						} else {
							playSoftPress();
						}
						props.onToggle(value);
					}}
				>
					<Switch.Thumb />
				</Switch>
			);
		}

		if (props.variant === "chevron") {
			return (
				<SymbolView name={CHEVRON_NAME} size={14} tintColor={mutedColor} />
			);
		}

		if (props.variant === "nav") {
			return (
				<View className="flex-row items-center gap-2">
					{props.value && (
						<AppText className="text-base text-foreground/50">
							{props.value}
						</AppText>
					)}
					<SymbolView name={CHEVRON_NAME} size={14} tintColor={mutedColor} />
				</View>
			);
		}

		return null;
	};

	const rowContent = (
		<View
			className={cn(
				"flex-row items-center justify-between px-5 py-4",
				className
			)}
		>
			{labelEl}
			{props.variant !== "action" && (
				<View className="ml-4">{renderTrailing()}</View>
			)}
		</View>
	);

	const isPressable =
		props.variant === "chevron" ||
		props.variant === "action" ||
		props.variant === "nav" ||
		(props.variant === "value" && !!props.onPress);

	return (
		<View>
			{isPressable ? (
				<Pressable
					android_ripple={ANDROID_RIPPLE}
					onPress={
						props.variant === "value" ||
						props.variant === "chevron" ||
						props.variant === "action" ||
						props.variant === "nav"
							? () => {
									// A `danger` row only opens a confirmation — the weight
									// belongs on the confirm, not on reaching for it.
									playSoftPress();
									props.onPress?.();
								}
							: undefined
					}
				>
					{rowContent}
				</Pressable>
			) : (
				rowContent
			)}
			{!isLast && <Separator className="mx-5" />}
		</View>
	);
};
