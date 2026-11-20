import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";

/** The player's glass: 44 pt tall, 22 pt sides, a capsule. */
const GLASS_H = 44;
const GLASS_SIDE = 22;

type Props = {
	/** A heading over the line: `type-title` when the state fills the page, `type-headline`
	 * inside one (`inline`). */
	title?: string;
	inline?: boolean;
	/** What went wrong, in the product's words. */
	message: string;
	/** The one button; none when there is nothing to try again. */
	retryLabel?: string;
	onRetry?: () => void;
	/** While a retry runs the button holds a spinner and can't be pressed again. */
	retrying?: boolean;
	className?: string;
};

/**
 * The player's "Couldn’t reach · Try again" (`features/player/stage/player-error.tsx`) on the
 * page: the line centred, then Try again in a glass capsule with a soft tick. For any screen or
 * part whose content couldn't load. Plain `Pressable`, no `PressScale`: the route error draws it
 * outside the providers `PressScale` reads.
 */
export function ErrorRetry({
	title,
	message,
	retryLabel,
	onRetry,
	retrying = false,
	inline = false,
	className,
}: Props) {
	return (
		<View className={cn("items-center gap-4.5", className)}>
			<View className="items-center gap-1.5">
				{title ? (
					<AppText
						accessibilityRole="header"
						center
						variant={inline ? "headline" : "title"}
					>
						{title}
					</AppText>
				) : null}
				<AppText
					accessibilityRole={title ? undefined : "alert"}
					center
					color="muted"
					variant="callout"
				>
					{message}
				</AppText>
			</View>
			{retryLabel && onRetry ? (
				<Pressable
					accessibilityLabel={retryLabel}
					accessibilityRole="button"
					accessibilityState={{ busy: retrying, disabled: retrying }}
					disabled={retrying}
					onPress={() => {
						playSoftPress();
						onRetry();
					}}
				>
					<GlassGroup
						className="justify-center"
						style={{
							height: GLASS_H,
							minWidth: GLASS_H * 2,
							paddingHorizontal: GLASS_SIDE,
						}}
					>
						{retrying ? (
							<ActivityIndicator colorClassName="accent-foreground" />
						) : (
							<AppText variant="callout" weight="semibold">
								{retryLabel}
							</AppText>
						)}
					</GlassGroup>
				</Pressable>
			) : null}
		</View>
	);
}
