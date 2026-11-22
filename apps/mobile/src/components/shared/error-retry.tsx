import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassGroup } from "@/components/shared/glass-group";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";

const GLASS_H = 44;
const GLASS_SIDE = 22;

type Props = {
	title?: string;
	inline?: boolean;
	message: string;
	retryLabel?: string;
	onRetry?: () => void;
	retrying?: boolean;
	className?: string;
};

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
