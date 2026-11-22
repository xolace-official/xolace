import * as Clipboard from "expo-clipboard";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import { openOrCopy, STORY_MAIL } from "@/features/lantern/story-call-model";
import { playSoftPress } from "@/lib/haptics";

/** The "share your story" card's button: Lantern home's and the Stories list's data hooks hand it on. */
export function useStoryCall(): () => Promise<void> {
	return async () => {
		playSoftPress();
		await openOrCopy(STORY_MAIL, {
			copy: Clipboard.setStringAsync,
			openURL: Linking.openURL,
			say: (message, description) => toast(message, { description }),
		});
	};
}
