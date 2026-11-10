/**
 * PROTOTYPE (#733) — Variant C "One question".
 * No list to order: "Where should check-ins find you?" with two choices. Picking Telegram
 * when it isn't linked opens a full-screen link moment. The fallback is stated, not configured.
 */
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SettingsSection } from "@/components/shared/settings-section";
import { RadioIconIndicator } from "@/features/settings/components/radio-icon-indicator";
import {
	type ChannelId,
	DISCONNECTED_COPY,
	type FakeChannels,
	LINK_DISCLOSURE,
	telegramSubtitle,
} from "@/features/settings/reach-prototype/fake-channels";
import {
	Btn,
	CHANNEL_NAME,
	ChannelGlyph,
	Notice,
	Pill,
} from "@/features/settings/reach-prototype/proto-ui";
import { cn } from "@/lib/utils";

export const VARIANT_C_NAME = "One question";

const ICON = {
	push: { android: "notifications", ios: "bell", web: "notifications" },
	telegram: { android: "send", ios: "paperplane", web: "send" },
} as const;

const LinkMoment = ({
	ch,
	onClose,
}: {
	ch: FakeChannels;
	onClose: () => void;
}) => (
	<View className="flex-1 justify-between bg-background px-6 pt-16 pb-12">
		<Notice text={ch.notice} />
		<View className="items-center gap-5">
			<ChannelGlyph boxed id="telegram" size={30} />
			<AppText className="text-center font-semibold text-3xl text-foreground">
				{ch.linkStep === "waiting"
					? "Say hi to the bot"
					: "Check-ins on Telegram"}
			</AppText>
			{ch.linkStep === "waiting" ? (
				<View className="items-center gap-3">
					<ActivityIndicator />
					<AppText className="text-center text-foreground/70">
						Tap Start in Telegram, then come back. This screen updates by
						itself.
					</AppText>
				</View>
			) : (
				<View className="gap-3">
					{LINK_DISCLOSURE.map((l) => (
						<AppText className="text-center text-foreground/70" key={l}>
							{l}
						</AppText>
					))}
				</View>
			)}
		</View>
		<View className="gap-2">
			{ch.linkStep === "waiting" ? (
				<Btn
					kind="secondary"
					label="(proto) Simulate /start"
					onPress={ch.completeLink}
				/>
			) : (
				<>
					<Btn label="Open Telegram" onPress={ch.openTelegram} />
					<Btn kind="text" label="Copy link instead" onPress={ch.copyLink} />
				</>
			)}
			<Btn kind="text" label="Not now" onPress={onClose} />
		</View>
	</View>
);

export const VariantC = ({ ch }: { ch: FakeChannels }) => {
	const t = ch.telegram;
	const [modal, setModal] = useState(false);
	const telegramUsable = t.kind === "linked" && !t.paused;
	const chosen: ChannelId =
		telegramUsable && ch.order[0] === "telegram" ? "telegram" : "push";

	const choose = (id: ChannelId) => {
		if (id === "telegram" && t.kind === "needs_plus") {
			return ch.openPaywall();
		}
		if (id === "telegram" && t.kind !== "linked") {
			ch.setLinkStep("disclose");
			return setModal(true);
		}
		ch.makeFirst(id);
	};

	return (
		<SettingsSection title="Where should check-ins find you?">
			<View className="gap-2 px-5">
				{(["push", "telegram"] as const).map((id) => (
					<Pressable
						accessibilityRole="radio"
						className={cn(
							"flex-row items-center gap-4 rounded-2xl px-4 py-4",
							chosen === id ? "bg-surface" : "bg-surface/30"
						)}
						key={id}
						onPress={() => choose(id)}
					>
						<RadioIconIndicator isSelected={chosen === id} symbol={ICON[id]} />
						<View className="flex-1 gap-0.5">
							<AppText className="font-medium text-base text-foreground">
								{id === "push" ? "A notification" : "A Telegram message"}
							</AppText>
							<AppText className="text-foreground/55 text-sm">
								{id === "push" ? "On this phone" : telegramSubtitle(t)}
							</AppText>
						</View>
						{id === "telegram" && t.kind === "needs_plus" && (
							<Pill label="Xolace+" tone="accent" />
						)}
					</Pressable>
				))}
			</View>
			{t.kind === "disconnected" && (
				<AppText className="px-5 pt-3 text-sm text-warning">
					{DISCONNECTED_COPY[t.reason]} Choose Telegram to link again.
				</AppText>
			)}
			<AppText className="px-5 pt-3 text-foreground/55 text-sm">
				{chosen === "telegram"
					? `If Telegram can't get through, you'll get a notification instead. Chat messages always come as ${CHANNEL_NAME.push.toLowerCase()}.`
					: "Chat messages from people always come as notifications."}
			</AppText>
			{t.kind === "linked" && (
				<View className="flex-row gap-2 px-4 pt-2">
					<Btn
						kind="text"
						label={t.paused ? "Resume Telegram" : "Pause Telegram"}
						onPress={ch.togglePause}
					/>
					<Btn kind="danger" label="Unlink Telegram" onPress={ch.unlink} />
				</View>
			)}
			<Modal
				animationType="fade"
				presentationStyle="fullScreen"
				visible={modal && t.kind !== "linked"}
			>
				<LinkMoment
					ch={ch}
					onClose={() => {
						ch.setLinkStep("idle");
						setModal(false);
					}}
				/>
			</Modal>
		</SettingsSection>
	);
};
