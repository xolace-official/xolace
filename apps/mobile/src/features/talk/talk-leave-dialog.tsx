// Leaving a live talk asks first. Back or swipe-back would otherwise hang up
// and make the mirror without a word, then pull them into it.

import { usePreventRemove } from "expo-router";
import { Button, Dialog } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import { AppText } from "@/src/components/shared/app-text";
import { JUST_END, MIRROR_LATER } from "@/src/features/talk/talk-copy";
import type { Talk } from "@/src/features/talk/use-talk";

export function TalkLeaveDialog({ talk }: { talk: Talk }) {
	const [open, setOpen] = useState(false);
	usePreventRemove(talk.live, () => setOpen(true));
	// A talk that ends with the dialog up (a dropped line, the silence cutoff)
	// closes it, so it can't come back by itself when a new talk connects.
	if (open && !talk.live) {
		setOpen(false);
	}
	const choose = (end?: () => void) => {
		setOpen(false);
		end?.();
	};
	return (
		<Dialog isOpen={open} onOpenChange={setOpen}>
			<Dialog.Portal>
				<DialogBlurBackdrop />
				<Dialog.Content className="mx-auto max-w-sm">
					<View className="mb-5 gap-1.5">
						<Dialog.Title>End this talk?</Dialog.Title>
						<Dialog.Description>
							<AppText className="text-foreground/60 text-sm">
								{`Your mirror can come now. Or just end: ${MIRROR_LATER.toLowerCase()}.`}
							</AppText>
						</Dialog.Description>
					</View>
					<View className="gap-2">
						<Button onPress={() => choose(talk.end)} variant="primary">
							Make my mirror
						</Button>
						<Button
							onPress={() => choose(talk.endWithoutMirror)}
							variant="secondary"
						>
							{JUST_END}
						</Button>
						<Button onPress={() => choose()} variant="ghost">
							Keep talking
						</Button>
					</View>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog>
	);
}
