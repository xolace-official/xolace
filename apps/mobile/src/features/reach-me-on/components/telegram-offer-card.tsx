import { Button } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { LinkSteps } from "@/features/reach-me-on/components/link-steps";
import { useTelegramOfferCard } from "@/features/reach-me-on/telegram-offer-data";
import { playSoftPress } from "@/lib/haptics";

export const TelegramOfferCard = () => {
	const { state, actions } = useTelegramOfferCard();
	const { link } = actions;

	if (!state.visible) {
		return null;
	}

	return (
		<View className="bg-surface px-5 pt-4">
			<View className="gap-4 rounded-3xl bg-accent/10 p-5">
				{state.link.step === "idle" ? (
					<>
						<AppText className="font-semibold text-foreground text-lg">
							Want the next check-in on Telegram?
						</AppText>
						<AppText className="text-foreground/70 text-sm">
							Answer with a tap, or just write back.
						</AppText>
						<View className="flex-row flex-wrap gap-2">
							<Button
								isDisabled={state.cantReach}
								onPress={() => {
									playSoftPress();
									link.start();
								}}
							>
								<Button.Label>Link Telegram</Button.Label>
							</Button>
							<Button
								accessibilityLabel="Not now, don't offer Telegram again"
								onPress={() => {
									playSoftPress();
									actions.notNow();
								}}
								variant="ghost"
							>
								<Button.Label>Not now</Button.Label>
							</Button>
						</View>
					</>
				) : (
					<LinkSteps
						disabled={state.cantReach}
						minting={state.link.minting}
						onCancel={link.cancel}
						onCopyLink={link.copyLink}
						onDismiss={link.dismiss}
						onOpenTelegram={link.openTelegram}
						step={state.link.step}
					/>
				)}
			</View>
		</View>
	);
};
