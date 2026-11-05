// Pin / Pinned in the badge detail header (#699), earned badges only. The
// server holds the limit: a 4th pin is refused, never swapped for an old one,
// so the button stays "Pin" and a toast says why.

import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Stack } from "expo-router";
import { useToast } from "heroui-native";
import { useState } from "react";
import { playSoftPress } from "@/lib/haptics";
import type { AchievementView } from "./types";

const LIMIT_REACHED = "You can pin 3 badges. Unpin one to pin this.";

function refusalFor(error: unknown, pinning: boolean) {
	const code =
		error instanceof ConvexError
			? (error.data as { code?: unknown } | undefined)?.code
			: undefined;
	if (code === "pin_limit_reached") {
		return LIMIT_REACHED;
	}
	return pinning
		? "Couldn't pin this badge. Try again."
		: "Couldn't unpin this badge. Try again.";
}

export function PinToolbar({ achievement }: { achievement: AchievementView }) {
	const { achievementId, earnedAt, pinned } = achievement;
	const setPinned = useMutation(api.achievements.pins.setPinned);
	const { toast } = useToast();
	const [saving, setSaving] = useState(false);
	if (earnedAt === undefined) {
		return null;
	}

	const handlePress = async () => {
		playSoftPress();
		setSaving(true);
		try {
			await setPinned({ achievementId, pinned: !pinned });
		} catch (error) {
			toast.show({ label: refusalFor(error, !pinned) });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Button
				accessibilityHint={
					pinned ? "Takes it off your profile" : "Shows it on your profile"
				}
				disabled={saving}
				onPress={handlePress}
				selected={pinned}
			>
				{pinned ? "Pinned" : "Pin"}
			</Stack.Toolbar.Button>
		</Stack.Toolbar>
	);
}
