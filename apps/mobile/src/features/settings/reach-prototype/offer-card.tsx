/**
 * PROTOTYPE (#733) — where else Telegram is offered: a card shown in the app right after
 * the person answers a check-in (here mounted at the top of the screen to look at it).
 */
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { FakeChannels } from "@/features/settings/reach-prototype/fake-channels";
import {
	Btn,
	ChannelGlyph,
} from "@/features/settings/reach-prototype/proto-ui";

export const OfferCard = ({ ch }: { ch: FakeChannels }) => {
	const [hidden, setHidden] = useState(false);
	if (hidden || ch.telegram.kind === "linked") {
		return null;
	}
	return (
		<View className="mx-5 mb-8 gap-3 rounded-3xl bg-surface p-5">
			<AppText className="text-foreground/50 text-xs uppercase tracking-widest">
				(proto) shown after answering a check-in
			</AppText>
			<View className="flex-row items-center gap-3">
				<ChannelGlyph boxed id="telegram" />
				<AppText className="flex-1 font-semibold text-base text-foreground">
					Want the next check-in on Telegram?
				</AppText>
			</View>
			<AppText className="text-foreground/65 text-sm">
				Answer with a tap or write back, without opening the app.
			</AppText>
			<View className="flex-row gap-2">
				<Btn
					className="flex-1"
					label="Link Telegram"
					onPress={() => ch.setLinkStep("disclose")}
				/>
				<Btn kind="text" label="Not now" onPress={() => setHidden(true)} />
			</View>
		</View>
	);
};
