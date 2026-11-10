/**
 * PROTOTYPE (#733) — Variant B "Own screen, channel cards".
 * Notifications gets one nav row; "Reach me on…" is its own sheet of big channel cards.
 * One card is marked "First"; linking is a 3-step flow inside the sheet.
 */
import { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SettingsRow } from "@/components/shared/settings-row";
import { SettingsSection } from "@/components/shared/settings-section";
import {
	type ChannelId,
	DISCONNECTED_COPY,
	type FakeChannels,
	LINK_DISCLOSURE,
} from "@/features/settings/reach-prototype/fake-channels";
import {
	Btn,
	CHANNEL_NAME,
	ChannelGlyph,
	Notice,
	Pill,
} from "@/features/settings/reach-prototype/proto-ui";
import { cn } from "@/lib/utils";

export const VARIANT_B_NAME = "Own screen, channel cards";

const Steps = ({ ch }: { ch: FakeChannels }) => {
	const step = ch.linkStep === "disclose" ? 1 : 2;
	return (
		<View className="gap-4 rounded-3xl bg-surface p-5">
			<View className="flex-row gap-2">
				{[1, 2, 3].map((n) => (
					<View
						className={cn(
							"h-1 flex-1 rounded-full",
							n <= step ? "bg-accent" : "bg-foreground/10"
						)}
						key={n}
					/>
				))}
			</View>
			{step === 1 ? (
				<>
					<AppText className="font-semibold text-foreground text-lg">
						Before you link
					</AppText>
					{LINK_DISCLOSURE.map((l) => (
						<AppText className="text-foreground/75 text-sm" key={l}>
							• {l}
						</AppText>
					))}
					<Btn label="Open Telegram" onPress={ch.openTelegram} />
					<Btn
						kind="text"
						label="Copy link for another device"
						onPress={ch.copyLink}
					/>
				</>
			) : (
				<>
					<AppText className="font-semibold text-foreground text-lg">
						Tap Start in Telegram
					</AppText>
					<View className="flex-row items-center gap-3">
						<ActivityIndicator />
						<AppText className="flex-1 text-foreground/70 text-sm">
							This updates on its own once the bot says hello. The link works
							for 15 minutes.
						</AppText>
					</View>
					<Btn
						kind="secondary"
						label="(proto) Simulate /start"
						onPress={ch.completeLink}
					/>
					<Btn
						kind="text"
						label="Cancel"
						onPress={() => ch.setLinkStep("idle")}
					/>
				</>
			)}
		</View>
	);
};

const TelegramBody = ({ ch }: { ch: FakeChannels }) => {
	const t = ch.telegram;
	if (ch.linkStep !== "idle") {
		return <Steps ch={ch} />;
	}
	switch (t.kind) {
		case "unlinked":
			return (
				<>
					<AppText className="text-foreground/70 text-sm">
						Get check-ins as a Telegram message. Answer with a tap, or just
						write back.
					</AppText>
					<Btn
						label="Link Telegram"
						onPress={() => ch.setLinkStep("disclose")}
					/>
				</>
			);
		case "disconnected":
			return (
				<>
					<AppText className="text-sm text-warning">
						{DISCONNECTED_COPY[t.reason]}
					</AppText>
					<Btn label="Link again" onPress={() => ch.setLinkStep("disclose")} />
				</>
			);
		case "needs_plus":
			return (
				<>
					<AppText className="text-foreground/70 text-sm">
						Telegram is now part of Xolace+. Your link to {t.handle} is kept;
						check-ins come as notifications until you're on Xolace+.
					</AppText>
					<Btn label="Get Xolace+" onPress={ch.openPaywall} />
				</>
			);
		default:
			return (
				<View className="flex-row flex-wrap gap-2">
					<Btn
						kind="secondary"
						label={t.paused ? "Resume" : "Pause"}
						onPress={ch.togglePause}
					/>
					<Btn kind="danger" label="Unlink" onPress={ch.unlink} />
				</View>
			);
	}
};

const Card = ({ ch, id }: { ch: FakeChannels; id: ChannelId }) => {
	const t = ch.telegram;
	const first = ch.order[0] === id;
	const usable = id === "push" || (t.kind === "linked" && !t.paused);
	const status =
		id === "push"
			? "On this phone"
			: t.kind === "linked"
				? `${t.paused ? "Paused" : "Linked"} · ${t.handle}`
				: null;
	return (
		<View
			className={cn(
				"gap-4 rounded-3xl p-5",
				first && usable ? "bg-accent/10" : "bg-surface/60"
			)}
		>
			<View className="flex-row items-center gap-3">
				<ChannelGlyph boxed id={id} size={22} />
				<View className="flex-1 gap-1">
					<AppText className="font-semibold text-foreground text-lg">
						{CHANNEL_NAME[id]}
					</AppText>
					{status && (
						<AppText className="text-foreground/55 text-sm">{status}</AppText>
					)}
				</View>
				{first && usable && <Pill label="First" tone="accent" />}
				{id === "telegram" && t.kind === "needs_plus" && (
					<Pill label="Xolace+" tone="accent" />
				)}
			</View>
			{id === "telegram" ? (
				<TelegramBody ch={ch} />
			) : (
				<AppText className="text-foreground/60 text-sm">
					Always used for chat messages from people.
				</AppText>
			)}
			{!first && usable && (
				<Btn
					kind="text"
					label="Try this first"
					onPress={() => ch.makeFirst(id)}
				/>
			)}
		</View>
	);
};

export const VariantB = ({ ch }: { ch: FakeChannels }) => {
	const [open, setOpen] = useState(true);
	const t = ch.telegram;
	const summary =
		t.kind === "linked" && !t.paused && ch.order[0] === "telegram"
			? "Telegram"
			: "Notifications";
	return (
		<>
			<SettingsSection title="Check-ins">
				<SettingsRow
					isLast
					label="Reach me on…"
					onPress={() => setOpen(true)}
					value={summary}
					variant="nav"
				/>
			</SettingsSection>
			<Modal
				animationType="slide"
				onRequestClose={() => setOpen(false)}
				presentationStyle="pageSheet"
				visible={open}
			>
				<View className="flex-1 bg-background">
					<Notice text={ch.notice} />
					<ScrollView contentContainerClassName="gap-4 p-5 pb-16">
						<View className="flex-row items-center justify-between">
							<AppText className="font-semibold text-2xl text-foreground">
								Reach me on…
							</AppText>
							<Btn kind="text" label="Done" onPress={() => setOpen(false)} />
						</View>
						<AppText className="text-base text-foreground/65">
							Where Xolace checks in on you. We use the one marked First, and
							the other if it can't get through.
						</AppText>
						<Card ch={ch} id="telegram" />
						<Card ch={ch} id="push" />
					</ScrollView>
				</View>
			</Modal>
		</>
	);
};
