// The talk door on Reflect home (#586, #594): Plus goes to the talk screen,
// free sees the same button as a Plus door, and Plus with the week's talk
// time used gets a dialog saying when it's back (#596). The server fences
// are requirePremium and the talk-time reserve in talk.session.start.

import { router } from "expo-router";
import { Button, Dialog } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
import { AppText } from "@/components/shared/app-text";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { TALK_TIME_RESETS } from "@/features/talk/talk-copy";
import { useCompanionName } from "@/features/talk/use-companion-name";
import { useTalkTime } from "@/features/talk/use-talk-time";

export function useTalkDoor() {
	const { isPlus, isResolved } = usePlusEntitlement();
	const [dialog, setDialog] = useState<"upsell" | "used" | null>(null);
	const openPaywall = usePaywall((s) => s.open);
	const posthog = usePostHog();
	const time = useTalkTime(isPlus);
	return {
		close: () => setDialog(null),
		dialog,
		onPress: () => {
			// `isPlus` reads false while loading: don't upsell a Plus person who
			// tapped early. Under 3 min but not 0 goes on: the consent card explains it (#586).
			if (isPlus) {
				if (time?.secondsLeft === 0) {
					setDialog("used");
				} else {
					router.push("/talk");
				}
			} else if (isResolved) {
				posthog.capture("plus_upsell_shown", { surface: "talk_door" });
				setDialog("upsell");
			}
		},
		upgrade: () => {
			setDialog(null);
			posthog.capture("plus_upsell_tapped", { surface: "talk_door" });
			openPaywall("talk_door");
		},
	};
}
export type TalkDoor = ReturnType<typeof useTalkDoor>;

export function TalkDoorDialog({ door }: { door: TalkDoor }) {
	const name = useCompanionName();
	const used = door.dialog === "used";
	return (
		<Dialog
			isOpen={door.dialog !== null}
			onOpenChange={(open) => !open && door.close()}
		>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<Dialog.Content className="mx-auto max-w-sm">
					<View className="mb-5 gap-1.5">
						<Dialog.Title>
							{used
								? "This week's talk time is used"
								: `Talk it through with ${name}`}
						</Dialog.Title>
						<Dialog.Description>
							<AppText className="text-foreground/60 text-sm">
								{used
									? `${TALK_TIME_RESETS}. You can still write a reflection here any time.`
									: `Speak or type with ${name}, out loud and back and forth. When you finish, the whole talk becomes your mirror. Talks are part of Xolace+.`}
							</AppText>
						</Dialog.Description>
					</View>
					<View className="flex-row justify-end gap-3">
						<Button onPress={door.close} size="sm" variant="ghost">
							{used ? "OK" : "Not now"}
						</Button>
						{!used && (
							<Button onPress={door.upgrade} size="sm" variant="primary">
								Upgrade to Xolace+
							</Button>
						)}
					</View>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
}
