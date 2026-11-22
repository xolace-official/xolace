import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { playAffirmativePress } from "@/lib/haptics";
import { useAppStore } from "@/store/store";

export function useWelcome() {
	const posthog = usePostHog();
	const setSeen = useAppStore((s) => s.setLibraryIntroSeen);
	return {
		begin: () => {
			playAffirmativePress();
			setSeen(true);
			posthog.capture("library_intro_completed");
			router.back();
		},
	};
}
