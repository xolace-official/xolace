import { Button, Dialog } from "heroui-native";
import { View } from "react-native";
import { DialogBlurBackdrop } from "@/components/dialog-blur-backdrop";
import { AppText } from "@/components/shared/app-text";
import type { DictationUpsell } from "@/features/reflect/hooks/use-dictation-upsell";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";

/** A free person's one introduction to Plus dictation, on their first mic tap (#559). */
export const DictationUpsellDialog = ({
	isOpen,
	onNotNow,
	onUpgrade,
	onDismiss,
}: DictationUpsell) => (
	<Dialog isOpen={isOpen} onOpenChange={(open) => !open && onDismiss()}>
		<Dialog.Portal>
			<DialogBlurBackdrop />
			<Dialog.Content className="mx-auto max-w-sm">
				<View className="mb-5 gap-1.5">
					<Dialog.Title>Sharper dictation</Dialog.Title>
					<Dialog.Description>
						<AppText className="text-foreground/60 text-sm">
							Your phone can already write down what you say. Xolace+ catches it
							more closely: the pauses, the names, the way you actually talk.
							Either way, it&apos;s yours to edit before you send it.
						</AppText>
					</Dialog.Description>
				</View>
				<View className="flex-row justify-end gap-3">
					<Button
						onPress={() => {
							playSoftPress();
							onNotNow();
						}}
						size="sm"
						variant="ghost"
					>
						Not now
					</Button>
					<Button
						onPress={() => {
							playAffirmativePress();
							onUpgrade();
						}}
						size="sm"
						variant="primary"
					>
						Upgrade to Xolace+
					</Button>
				</View>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog>
);
