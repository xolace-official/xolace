import { Button } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import {
	CardTag,
	ChannelCard,
} from "@/features/reach-me-on/components/channel-card";
import { LinkSteps } from "@/features/reach-me-on/components/link-steps";
import { useReachSheet } from "@/features/reach-me-on/reach-sheet-data";
import {
	type ChannelEntry,
	orderMark,
	type TelegramAction,
	telegramCard,
} from "@/features/reach-me-on/reach-view";
import { playSoftPress } from "@/lib/haptics";

const ACTION_LABEL: Record<TelegramAction, string> = {
	get_plus: "Get Xolace+",
	link: "Link Telegram",
	link_again: "Link again",
	pause: "Pause",
	resume: "Resume",
	unlink: "Unlink",
};

/**
 * A lone action, or Get Xolace+, is the card's call to action; Unlink reads
 * as destructive.
 */
function buttonVariant(action: TelegramAction, count: number) {
	if (count === 1 || action === "get_plus") {
		return "primary";
	}
	return action === "unlink" ? "danger-soft" : "secondary";
}

/** The Telegram card, per `listChannels` state, with the link flow inside it.
 * Reads and acts through the sheet's provider. */
export const TelegramCard = ({ entry }: { entry: ChannelEntry }) => {
	const view = telegramCard(entry);
	const {
		state: { link, offline },
		actions,
	} = useReachSheet();
	const [confirmUnlink, setConfirmUnlink] = useState(false);

	const run: Record<TelegramAction, () => void> = {
		get_plus: actions.getPlus,
		link: actions.link.start,
		link_again: actions.link.start,
		pause: () => actions.setPaused("telegram", true),
		resume: () => actions.setPaused("telegram", false),
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
			onTryFirst={() => actions.tryFirst("telegram")}
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
					{view.actions.length > 0 && (
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
					)}
				</>
			) : (
				<LinkSteps
					disabled={offline}
					minting={link.minting}
					onCancel={actions.link.cancel}
					onCopyLink={actions.link.copyLink}
					onDismiss={actions.link.dismiss}
					onOpenTelegram={actions.link.openTelegram}
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
					actions.unlink("telegram");
				}}
				onOpenChange={setConfirmUnlink}
				title="Unlink Telegram?"
			/>
		</ChannelCard>
	);
};
