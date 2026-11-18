import { useState } from "react";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import type { IconName } from "@/components/shared/icon";
import {
	type CardAction,
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

const ACTION: Record<TelegramAction, { label: string; icon: IconName }> = {
	get_plus: {
		icon: { android: "workspace_premium", ios: "sparkles" },
		label: "Get Xolace+",
	},
	link: { icon: { android: "link", ios: "link" }, label: "Link Telegram" },
	link_again: {
		icon: { android: "link", ios: "link" },
		label: "Link again",
	},
	pause: {
		icon: { android: "pause_circle", ios: "pause.circle" },
		label: "Pause",
	},
	resume: {
		icon: { android: "play_circle", ios: "play.circle" },
		label: "Resume",
	},
	unlink: {
		icon: { android: "link_off", ios: "minus.circle" },
		label: "Unlink",
	},
};

const BODY = "text-[15px] leading-[21px]";

/** The Telegram card, per `listChannels` state, with the link flow inside it.
 * Reads and acts through the sheet's provider. */
export const TelegramCard = ({ entry }: { entry: ChannelEntry }) => {
	const view = telegramCard(entry);
	const {
		state: { link, offline },
		actions,
	} = useReachSheet();
	const [confirmUnlink, setConfirmUnlink] = useState(false);
	const idle = link.step === "idle";

	const run: Record<TelegramAction, () => void> = {
		get_plus: actions.getPlus,
		link: actions.link.start,
		link_again: actions.link.start,
		pause: () => actions.setPaused("telegram", true),
		resume: () => actions.setPaused("telegram", false),
		unlink: () => setConfirmUnlink(true),
	};
	const rows: CardAction[] = idle
		? view.actions.map((action) => ({
				...ACTION[action],
				danger: action === "unlink",
				offlineOk: action === "get_plus",
				onPress: run[action],
			}))
		: [];
	const hasBody = !idle || Boolean(view.description || view.warning);

	return (
		<>
			<ChannelCard
				actions={rows}
				channel="telegram"
				disabled={offline}
				mark={idle || link.step === "linked" ? orderMark(entry) : null}
				onTryFirst={() => actions.tryFirst("telegram")}
				statusLine={view.statusLine}
				tag={view.plusBadge ? "Xolace+" : undefined}
			>
				{hasBody ? (
					<>
						{idle && view.description ? (
							<AppText className={`${BODY} text-foreground/70`} variant="body">
								{view.description}
							</AppText>
						) : null}
						{idle && view.warning ? (
							<AppText className={`${BODY} text-warning`} variant="body">
								{view.warning}
							</AppText>
						) : null}
						{link.step === "idle" ? null : (
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
					</>
				) : null}
			</ChannelCard>
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
		</>
	);
};
