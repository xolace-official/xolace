import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { getInitials } from "@/helpers/utils/strings";
import { cn } from "@/lib/utils";

const SIZES = {
	lg: { box: "h-[76px] w-[76px]", text: "text-2xl" },
	md: { box: "h-11 w-11", text: "text-[15px]" },
	sm: { box: "h-9 w-9", text: "text-xs" },
} as const;

const CAMPFIRE_IMAGE = require("@/assets/images/flux/campfire-mini.jpeg");

/**
 * Initial-or-photo avatar. `muted` renders the resting/unavailable look
 * (grey surface instead of accent) per the mockup. `campfire` is the Xolace
 * broadcast channel's identity specifically — no person, no photo, so it
 * gets the campfire mark instead of an "X" initial. Not a general fallback:
 * every other row still falls through to initials.
 */
export function XolacerAvatar({
	name,
	photoUrl,
	size = "md",
	muted = false,
	campfire = false,
}: {
	name: string;
	photoUrl?: string;
	size?: keyof typeof SIZES;
	muted?: boolean;
	campfire?: boolean;
}) {
	const { box, text } = SIZES[size];

	if (campfire) {
		return (
			<View
				className={cn(box, "overflow-hidden rounded-full bg-surface-secondary")}
			>
				<Image
					contentFit="cover"
					source={CAMPFIRE_IMAGE}
					style={StyleSheet.absoluteFill}
				/>
			</View>
		);
	}

	if (photoUrl) {
		return (
			<View
				className={cn(
					box,
					"overflow-hidden rounded-full bg-surface-secondary",
					muted && "opacity-50"
				)}
			>
				<Image
					contentFit="cover"
					source={{ uri: photoUrl }}
					style={StyleSheet.absoluteFill}
				/>
			</View>
		);
	}
	return (
		<View
			className={cn(
				box,
				"items-center justify-center rounded-full",
				muted ? "bg-surface-tertiary" : "bg-accent"
			)}
		>
			<AppText
				className={cn(
					text,
					"font-semibold",
					muted ? "text-muted" : "text-accent-foreground"
				)}
			>
				{getInitials(name)}
			</AppText>
		</View>
	);
}
