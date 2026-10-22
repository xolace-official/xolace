import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { PressableFeedback } from "heroui-native";

import { AppText } from "@/src/components/shared/app-text";
import { OptionCard, type IconKey } from "@/src/features/follow-up/stack-cards";
import {
  STILL_HERE_LINKS,
  STILL_HERE_MESSAGE,
  STILL_HERE_SKIP,
} from "@/src/features/reflect/follow-up-copy";

type LinkKey = (typeof STILL_HERE_LINKS)[number]["key"];

// Same entry points as the Browse hub's tiles — static on purpose, no Kindling twig.
export const LINK: Record<LinkKey, { icon: IconKey; tint: string; href: Href }> = {
  music: { icon: "music", tint: "bg-accent/20", href: "/browse/list?family=music" },
  support: { icon: "waveform", tint: "bg-frost/20", href: "/browse/list?family=support" },
  library: { icon: "book", tint: "bg-ember/25", href: "/browse/library" },
};

/**
 * The `still_here` next step (#451): an acknowledgment and three optional
 * doorways. Nothing to fill in, nothing to earn — the chip answer already
 * stands, so every way out (a link, Not now, X) is equally fine.
 */
export function StillHereStep({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const posthog = usePostHog();

  return (
    <>
      <View className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface">
        <View className="bg-frost/20 px-5 pb-12 pt-5">
          <AppText className="text-base leading-6 text-foreground/80">{STILL_HERE_MESSAGE}</AppText>
        </View>
      </View>
      {STILL_HERE_LINKS.map(({ key, title, sub }) => (
        <OptionCard
          key={key}
          icon={LINK[key].icon}
          tint={LINK[key].tint}
          title={title}
          sub={sub}
          onPress={() => {
            posthog.capture("follow_up_still_here_link_tapped", { destination: key });
            // Close the modal, then swap reflect for the tab — the idle menu's
            // replace, so reflect stays the "/" landing with no back stack.
            router.back();
            router.replace(LINK[key].href, { withAnchor: true });
          }}
        />
      ))}
      <View className="items-center bg-surface pt-4">
        <PressableFeedback
          onPress={onClose}
          accessibilityRole="button"
          hitSlop={12}
          className="min-h-11 items-center justify-center"
        >
          <AppText className="text-sm text-foreground/55">{STILL_HERE_SKIP}</AppText>
        </PressableFeedback>
      </View>
    </>
  );
}
