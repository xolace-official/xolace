import { type Href, useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { View } from "react-native";

import { AppText } from "@/components/shared/app-text";
import {
	STILL_HERE_LINKS,
	STILL_HERE_MESSAGE,
	STILL_HERE_SKIP,
} from "@/features/follow-up/follow-up-copy";
import { type IconKey, OptionCard } from "@/features/follow-up/stack-cards";

type LinkKey = (typeof STILL_HERE_LINKS)[number]["key"];

// Same entry points as the Browse hub's tiles; static on purpose, no Kindling twig.
export const LINK: Record<
	LinkKey,
	{ icon: IconKey; tint: string; href: Href }
> = {
	library: { href: "/browse/library", icon: "book", tint: "bg-ember/25" },
	music: {
		href: "/browse/list?family=music",
		icon: "music",
		tint: "bg-accent/20",
	},
	support: {
		href: "/browse/list?family=support",
		icon: "waveform",
		tint: "bg-frost/20",
	},
};

/** The `still_here` next step (#451): an acknowledgment and three optional doorways. */
export function StillHereStep({ onClose }: { onClose: () => void }) {
	const router = useRouter();
	const posthog = usePostHog();

	return (
		<>
			<View className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface">
				<View className="bg-frost/20 px-5 pt-5 pb-12">
					<AppText className="text-base text-foreground/80 leading-6">
						{STILL_HERE_MESSAGE}
					</AppText>
				</View>
			</View>
			{STILL_HERE_LINKS.map(({ key, title, sub }) => (
				<OptionCard
					icon={LINK[key].icon}
					key={key}
					onPress={() => {
						posthog.capture("follow_up_still_here_link_tapped", {
							destination: key,
						});
						// Close the modal, then replace reflect with the tab (as the idle menu
						// does) so reflect stays the "/" landing with no back stack.
						router.back();
						router.replace(LINK[key].href, { withAnchor: true });
					}}
					sub={sub}
					tint={LINK[key].tint}
					title={title}
				/>
			))}
			<View className="items-center bg-surface pt-4">
				<PressableFeedback
					accessibilityRole="button"
					className="min-h-11 items-center justify-center"
					hitSlop={12}
					onPress={onClose}
				>
					<AppText className="text-foreground/55 text-sm">
						{STILL_HERE_SKIP}
					</AppText>
				</PressableFeedback>
			</View>
		</>
	);
}
