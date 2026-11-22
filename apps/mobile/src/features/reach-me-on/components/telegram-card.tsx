import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Icon } from "@/components/shared/icon";
import { ChannelCard } from "@/features/reach-me-on/components/channel-card";
import { LinkSteps } from "@/features/reach-me-on/components/link-steps";
import { Pill, type PillTone } from "@/features/reach-me-on/components/pill";
import { useReachSheet } from "@/features/reach-me-on/reach-sheet-data";
import {
	type ChannelEntry,
	orderMark,
	type TelegramAction,
	telegramCard,
} from "@/features/reach-me-on/reach-view";
import { useTokenColor } from "@/lib/use-token-color";

const ACTION_LABEL: Record<TelegramAction, string> = {
	get_plus: "Get Xolace+",
	link: "Link Telegram",
	link_again: "Link again",
	pause: "Pause",
	resume: "Resume",
	unlink: "Unlink",
};

const WARNING = {
	android: "warning",
	ios: "exclamationmark.triangle.fill",
} as const;

function pillTone(action: TelegramAction, count: number): PillTone {
	if (count === 1 || action === "get_plus") {
		return "primary";
	}
	return action === "unlink" ? "danger" : "secondary";
}

export const TelegramCard = ({ entry }: { entry: ChannelEntry }) => {
	const view = telegramCard(entry);
	const ember = useTokenColor("ember-ink");
	const {
		state: { link, offline },
		actions,
	} = useReachSheet();
	const [confirmUnlink, setConfirmUnlink] = useState(false);
	const linking = link.step !== "idle";

	const run: Record<TelegramAction, () => void> = {
		get_plus: actions.getPlus,
		link: actions.link.start,
		link_again: actions.link.start,
		pause: () => actions.setPaused("telegram", true),
		resume: () => actions.setPaused("telegram", false),
		unlink: () => setConfirmUnlink(true),
	};

	return (
		<View>
			<ChannelCard
				channel="telegram"
				disabled={offline}
				mark={
					link.step === "idle" || link.step === "linked"
						? orderMark(entry)
						: null
				}
				onTryFirst={() => actions.tryFirst("telegram")}
				plusTag={view.plusBadge === true}
				statusLine={linking ? undefined : view.statusLine}
			>
				{link.step === "idle" ? (
					<>
						{view.description ? (
							<AppText
								className="text-[14.5px] text-foreground/70 leading-5"
								variant="body"
							>
								{view.description}
							</AppText>
						) : null}
						{view.warning ? (
							<View className="flex-row gap-2">
								<View className="mt-[3px]">
									<Icon color={ember} name={WARNING} size={14} />
								</View>
								<AppText
									className="flex-1 text-[14.5px] text-ember-ink leading-5"
									variant="body"
								>
									{view.warning}
								</AppText>
							</View>
						) : null}
						{view.actions.length > 0 ? (
							<View className="flex-row flex-wrap gap-2">
								{view.actions.map((action) => (
									<Pill
										disabled={offline && action !== "get_plus"}
										key={action}
										label={ACTION_LABEL[action]}
										onPress={run[action]}
										tone={pillTone(action, view.actions.length)}
									/>
								))}
							</View>
						) : null}
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
		</View>
	);
};
