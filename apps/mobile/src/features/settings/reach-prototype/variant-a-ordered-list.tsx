/**
 * PROTOTYPE (#733) — Variant A "Ordered list, inline".
 * A "Reach me on" section at the top of the existing Notifications screen: channels as a
 * numbered list you reorder with arrows; linking expands inline under the Telegram row.
 */
import { SymbolView } from "expo-symbols";
import { Switch, useThemeColor } from "heroui-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SettingsSection } from "@/components/shared/settings-section";
import {
	type ChannelId,
	type FakeChannels,
	LINK_DISCLOSURE,
	telegramSubtitle,
} from "@/features/settings/reach-prototype/fake-channels";
import {
	Btn,
	CHANNEL_NAME,
	ChannelGlyph,
	Pill,
} from "@/features/settings/reach-prototype/proto-ui";

export const VARIANT_A_NAME = "Ordered list, inline";

const Arrow = ({ up, onPress }: { up: boolean; onPress: () => void }) => {
	const muted = useThemeColor("muted") as string;
	return (
		<Pressable accessibilityRole="button" hitSlop={8} onPress={onPress}>
			<SymbolView
				name={up ? "chevron.up" : "chevron.down"}
				size={14}
				tintColor={muted}
			/>
		</Pressable>
	);
};

const LinkPanel = ({ ch }: { ch: FakeChannels }) => (
	<View className="mx-5 mb-3 gap-3 rounded-2xl bg-surface/50 p-4">
		{ch.linkStep === "disclose" && (
			<>
				{LINK_DISCLOSURE.map((l) => (
					<AppText className="text-foreground/75 text-sm" key={l}>
						• {l}
					</AppText>
				))}
				<Btn label="Open Telegram" onPress={ch.openTelegram} />
				<Btn kind="text" label="Copy link instead" onPress={ch.copyLink} />
			</>
		)}
		{ch.linkStep === "waiting" && (
			<>
				<View className="flex-row items-center gap-3">
					<ActivityIndicator />
					<AppText className="flex-1 text-foreground/75 text-sm">
						Waiting for Telegram. Tap Start in the chat with Xolace.
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

const TelegramControls = ({ ch }: { ch: FakeChannels }) => {
	const t = ch.telegram;
	if (t.kind === "unlinked" || t.kind === "disconnected") {
		return ch.linkStep === "idle" ? (
			<Btn
				className="mx-5 mb-3"
				kind="secondary"
				label={t.kind === "unlinked" ? "Link Telegram" : "Link again"}
				onPress={() => ch.setLinkStep("disclose")}
			/>
		) : (
			<LinkPanel ch={ch} />
		);
	}
	if (t.kind === "needs_plus") {
		return (
			<Btn
				className="mx-5 mb-3"
				label="Get Xolace+ to resume"
				onPress={ch.openPaywall}
			/>
		);
	}
	return (
		<View className="mx-5 mb-3 flex-row items-center justify-between">
			<View className="flex-row items-center gap-2">
				<Switch isSelected={!t.paused} onSelectedChange={ch.togglePause}>
					<Switch.Thumb />
				</Switch>
				<AppText className="text-foreground/70 text-sm">
					{t.paused ? "Paused" : "On"}
				</AppText>
			</View>
			<Btn kind="danger" label="Unlink" onPress={ch.unlink} />
		</View>
	);
};

const Row = ({
	ch,
	id,
	index,
}: {
	ch: FakeChannels;
	id: ChannelId;
	index: number;
}) => {
	const t = ch.telegram;
	const usable = id === "push" || (t.kind === "linked" && !t.paused);
	return (
		<View>
			<View className="flex-row items-center gap-3 px-5 py-3">
				<AppText className="w-5 text-center font-semibold text-accent">
					{usable ? index + 1 : "–"}
				</AppText>
				<ChannelGlyph id={id} />
				<View className="flex-1 gap-0.5">
					<AppText className="font-medium text-base text-foreground">
						{CHANNEL_NAME[id]}
					</AppText>
					<AppText className="text-foreground/55 text-sm">
						{id === "push" ? "On this phone" : telegramSubtitle(t)}
					</AppText>
				</View>
				{id === "telegram" && t.kind === "needs_plus" && (
					<Pill label="Xolace+" tone="accent" />
				)}
				<View className="gap-2">
					<Arrow onPress={() => ch.move(id, -1)} up />
					<Arrow onPress={() => ch.move(id, 1)} up={false} />
				</View>
			</View>
			{id === "telegram" && <TelegramControls ch={ch} />}
		</View>
	);
};

export const VariantA = ({ ch }: { ch: FakeChannels }) => (
	<SettingsSection title="Reach me on">
		{ch.order.map((id, i) => (
			<Row ch={ch} id={id} index={i} key={id} />
		))}
		<AppText className="px-5 pt-1 text-foreground/55 text-sm">
			Check-ins try the top one first. If it can't reach you, the next one. Chat
			messages from people always come as notifications.
		</AppText>
	</SettingsSection>
);
