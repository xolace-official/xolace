import { Button as HeroButton } from "heroui-native";
import type { ComponentProps } from "react";
import { PlayfulLip } from "@/src/lib/playful/playful-lip";
import { useIsPlayful, usePlayfulPress } from "@/src/lib/playful/use-playful";
import { cn } from "@/src/lib/utils";

type ButtonProps = ComponentProps<typeof HeroButton>;

const LIP_BY_VARIANT: Record<string, string> = {
	danger: "bg-danger-lip",
	outline: "bg-border",
	primary: "bg-accent-lip",
	secondary: "bg-default-lip",
	tertiary: "bg-default-lip",
};

// HeroUI's button corner (radius-3xl) under Playful's --radius.
const BUTTON_RADIUS = 16;

/**
 * HeroUI's Button, plus the Playful press-down: under Playful the lip moves
 * out of the button's border into a PlayfulLip slab, and the face sinks onto
 * it while held. Every other theme gets HeroUI's Button untouched.
 */
function PlayfulAwareButton(props: ButtonProps) {
	const isPlayful = useIsPlayful();
	const press = usePlayfulPress();
	const lip = LIP_BY_VARIANT[props.variant ?? "primary"];
	if (!(isPlayful && lip)) {
		return <HeroButton {...props} />;
	}
	return (
		<PlayfulLip
			lipClassName={props.isDisabled ? "bg-border" : lip}
			pressed={press.pressed}
			radius={BUTTON_RADIUS}
		>
			<HeroButton
				{...props}
				animation={{ highlight: false, scale: false }}
				className={cn(props.className, "border-b-0")}
				feedbackVariant="scale-highlight"
				onPressIn={(e) => {
					press.onPressIn();
					if (typeof props.onPressIn === "function") {
						props.onPressIn(e);
					}
				}}
				onPressOut={(e) => {
					press.onPressOut();
					if (typeof props.onPressOut === "function") {
						props.onPressOut(e);
					}
				}}
			/>
		</PlayfulLip>
	);
}

/** Drop-in for `Button` from heroui-native, with the same compound parts. */
export const Button = Object.assign(PlayfulAwareButton, {
	Label: HeroButton.Label,
});
