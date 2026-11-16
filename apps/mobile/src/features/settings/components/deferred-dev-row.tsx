/** Dev tools row that replays the asks intake v2 moved into the app (#712); the server
 * honours it only with DEV_TOOLS_ENABLED. */
import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { SymbolView } from "expo-symbols";
import { useToast } from "heroui-native";
import { SettingsRow } from "@/components/shared/settings-row";
import { useTokenColor } from "@/lib/use-token-color";
import { useAppStore } from "@/store/store";

const DEFERRED_ICON = {
	android: "quiz",
	ios: "questionmark.bubble",
	web: "quiz",
} as const;

export function DeferredQuestionsDevRow() {
	const { toast } = useToast();
	const { userId } = useAuth();
	const muted = useTokenColor("muted");
	const clearDeferredAnswers = useMutation(api.devTools.clearDeferredAnswers);

	const replay = async () => {
		try {
			await clearDeferredAnswers();
		} catch (e: unknown) {
			toast.show({
				description:
					e instanceof Error ? e.message : "Is DEV_TOOLS_ENABLED set?",
				label: "Deferred questions replay failed",
				variant: "danger",
			});
			return;
		}
		// The once-only marks kept on this device, so each ask can show again here.
		useAppStore.setState({ shakeHintSeen: false });
		if (userId) {
			useAppStore
				.getState()
				.clearAccountFlags(userId, [
					"copingAskSeen",
					"findingCardDismissed",
					"notifNudgeDismissed",
				]);
		}
		toast.show({
			description:
				"Coping and frequency ask at the next session end; the reminder step needs notifications not yet decided. The how-you-found-us card waits for day 3.",
			label: "Deferred questions cleared",
		});
	};

	return (
		<SettingsRow
			icon={<SymbolView name={DEFERRED_ICON} size={17} tintColor={muted} />}
			label="Replay deferred questions"
			onPress={replay}
			variant="action"
		/>
	);
}
