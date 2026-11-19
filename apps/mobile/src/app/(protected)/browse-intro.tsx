import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { BrowseIntroScreen } from "@/components/shared/browse-intro-screen";
import { useBackHandler } from "@/components/ui/tour/use-back-handler";
import { useAppStore } from "@/store/store";

type Family = "music" | "support";

// Dev/preview storage buckets differ from prod (Convex deploys are per-env).
const HERO_IMAGE: Record<Family, string> = __DEV__
	? {
			music:
				"https://groovy-mandrill-892.eu-west-1.convex.cloud/api/storage/e3196aca-e476-4708-b734-4acc433aa39b",
			support:
				"https://groovy-mandrill-892.eu-west-1.convex.cloud/api/storage/a3659ad0-ea0f-4413-a583-5e7eea25639b",
		}
	: {
			music:
				"https://energetic-guineapig-283.convex.cloud/api/storage/71b886f9-7035-4df2-b35c-1d2720846426",
			support:
				"https://energetic-guineapig-283.convex.cloud/api/storage/860bd876-2ea7-400b-91b8-deef7e444286",
		};

const CONTENT: Record<
	Family,
	{ title: string; subtitle: string; event: string }
> = {
	music: {
		event: "music_intro_completed",
		subtitle:
			"A growing catalogue picked for how it feels, not just how it sounds. New tracks arrive as the collection grows.",
		title: "Music, built for support",
	},
	support: {
		event: "support_audio_intro_completed",
		subtitle:
			"Short guided pieces to sit with, whenever things get loud. New sessions arrive as the collection grows.",
		title: "Support audio, for when words are hard",
	},
};

/** Browse family welcome, full-screen modal. Opened by Explore's Support audio and Music list
 * (`useFamilyList`, `?family=`); each intro flag is independent. Lantern has its own (`/lantern-welcome`). */
export default function BrowseIntroRoute() {
	const { family: rawFamily } = useLocalSearchParams<{ family?: string }>();
	const family: Family = rawFamily === "support" ? "support" : "music";
	const posthog = usePostHog();
	const setMusicIntroSeen = useAppStore((s) => s.setMusicIntroSeen);
	const setSupportAudioIntroSeen = useAppStore(
		(s) => s.setSupportAudioIntroSeen
	);
	const { title, subtitle, event } = CONTENT[family];
	// gestureEnabled:false does not cover Android back; swallow it so the hold
	// stays the only way out.
	useBackHandler(true, () => {});

	return (
		<BrowseIntroScreen
			ctaLabel="Hold to begin"
			heroImage={{ uri: HERO_IMAGE[family] }}
			onContinue={() => {
				if (family === "music") {
					setMusicIntroSeen(true);
				} else {
					setSupportAudioIntroSeen(true);
				}
				posthog.capture(event);
				router.back();
			}}
			subtitle={subtitle}
			title={title}
		/>
	);
}
