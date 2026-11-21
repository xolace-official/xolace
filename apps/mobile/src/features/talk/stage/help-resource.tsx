import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { opensResource } from "../talk-model";

export function HelpResource({
	resource,
	onOpen,
}: {
	resource: Resource;
	onOpen: (resource: Resource) => void;
}) {
	const xolace = resource.source === "xolace_support";
	const opens = opensResource(resource);
	const body = (
		<View
			className={cn(
				"rounded-row border px-4 py-3",
				xolace
					? "border-accent/30 bg-accent-wash"
					: "border-separator bg-background"
			)}
			style={{ borderCurve: "continuous" }}
		>
			<View className="flex-row items-center justify-between gap-3">
				<AppText
					className="flex-1"
					color={xolace ? "accent" : "foreground"}
					variant="footnote"
					weight="medium"
				>
					{resource.label}
				</AppText>
				{opens ? (
					<AppText color="accent" variant="caption" weight="semibold">
						{resource.type === "url" ? "Open" : resource.value}
					</AppText>
				) : null}
			</View>
			{resource.description ? (
				<AppText color="subtle" variant="caption">
					{resource.description}
				</AppText>
			) : null}
			{resource.type === "text" ? (
				<AppText color="muted" variant="caption">
					{resource.value}
				</AppText>
			) : null}
		</View>
	);
	if (!opens) {
		return (
			<View accessibilityLabel={`${resource.label}: ${resource.value}`}>
				{body}
			</View>
		);
	}
	return (
		<PressScale
			accessibilityLabel={`${resource.label}, ${resource.value}`}
			card
			haptic={playSoftPress}
			onPress={() => onOpen(resource)}
		>
			{body}
		</PressScale>
	);
}
