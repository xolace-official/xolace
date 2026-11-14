import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { usePaywall } from "@/features/purchases/use-paywall";
import {
	CardTag,
	ChannelCard,
} from "@/features/reach-me-on/components/channel-card";
import { LinkSteps } from "@/features/reach-me-on/components/link-steps";
import {
	type ChannelEntry,
	orderMark,
	type TelegramAction,
	telegramCard,
} from "@/features/reach-me-on/reach-view";
import { useTelegramLink } from "@/features/reach-me-on/use-telegram-link";
import { playSoftPress } from "@/lib/haptics";

const ACTION_LABEL: Record<TelegramAction, string> = {
	get_plus: "Get Xolace+",
	link: "Link Telegram",
	link_again: "Link again",
	pause: "Pause",
	resume: "Resume",
	unlink: "Unlink",
};

/** A lone action is the card's call to action; Unlink reads as destructive. */
function buttonVariant(action: TelegramAction, count: number) {
	if (count === 1) {
		return "primary";
	}
	return action === "unlink" ? "danger-soft" : "secondary";
}

type Props = {
	entry: ChannelEntry;
	offline: boolean;
	onTryFirst: () => void;
	onSetPaused: (paused: boolean) => void;
	onUnlink: () => void;
};

/** The Telegram card, per `listChannels` state, with the link flow inside it. */
export const TelegramCard = ({
	entry,
	offline,
	onTryFirst,
	onSetPaused,
	onUnlink,
}: Props) => {
	const view = telegramCard(entry);
	const link = useTelegramLink(entry);
	const openPaywall = usePaywall((s) => s.open);
	const [confirmUnlink, setConfirmUnlink] = useState(false);

	const run: Record<TelegramAction, () => void> = {
		get_plus: () => openPaywall("reach_telegram"),
		link: link.start,
		link_again: link.start,
		pause: () => onSetPaused(true),
		resume: () => onSetPaused(false),
		unlink: () => setConfirmUnlink(true),
	};

	return (
		<ChannelCard
			badges={view.plusBadge && <CardTag label="Xolace+" />}
			channel="telegram"
			disabled={offline}
			mark={
				link.step === "idle" || link.step === "linked" ? orderMark(entry) : null
			}
			onTryFirst={onTryFirst}
			statusLine={view.statusLine}
		>
			{link.step === "idle" ? (
				<>
					{view.description && (
						<AppText className="text-foreground/70 text-sm">
							{view.description}
						</AppText>
					)}
					{view.warning && (
						<AppText className="text-sm text-warning">{view.warning}</AppText>
					)}
					<View className="flex-row flex-wrap gap-2">
						{view.actions.map((action) => (
							<Button
								isDisabled={offline && action !== "get_plus"}
								key={action}
								onPress={() => {
									playSoftPress();
									run[action]();
								}}
								variant={buttonVariant(action, view.actions.length)}
							>
								<Button.Label>{ACTION_LABEL[action]}</Button.Label>
							</Button>
						))}
					</View>
				</>
			) : (
				<LinkSteps
					disabled={offline}
					minting={link.minting}
					onCancel={link.cancel}
					onCopyLink={link.copyLink}
					onDismiss={link.dismiss}
					onOpenTelegram={link.openTelegram}
					step={link.step}
				/>
			)}
			<ConfirmationDialog
				confirmLabel="Unlink"
				description="Xolace stops checking in on Telegram and says goodbye in the chat. You can link again any time."
				isDestructive
				isOpen={confirmUnlink}
				onConfirm={() => {
					setConfirmUnlink(false);
					onUnlink();
				}}
				onOpenChange={setConfirmUnlink}
				title="Unlink Telegram?"
			/>
		</ChannelCard>
	);
};
