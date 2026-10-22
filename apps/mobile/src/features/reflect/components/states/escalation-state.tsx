import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";
import { playAffirmativePress, playSoftPress } from "@/src/lib/haptics";
import type { Resource } from "@/src/features/crisis-resources/types";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";

type Props = {
  mirror: string;
  resources: (string | Resource)[] | null;
  onEngage: () => Promise<void>;
  onDismiss: () => Promise<void>;
  onContinue: () => Promise<void>;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
const EASE_RESOURCES_HEADER = {
  type: "timing" as const,
  duration: 400,
  easing: EASING,
};
const EASE_PROMPT_MIRROR = {
  type: "timing" as const,
  duration: 600,
  delay: 200,
  easing: EASING,
};
const EASE_PROMPT_MSG = {
  type: "timing" as const,
  duration: 800,
  delay: 600,
  easing: EASING,
};
const EASE_ENGAGE_BTN = {
  type: "timing" as const,
  duration: 500,
  delay: 1200,
  easing: EASING,
};
const EASE_DISMISS_BTN = {
  type: "timing" as const,
  duration: 500,
  delay: 1400,
  easing: EASING,
};

function ResourceItem({
  resource,
  index,
}: {
  resource: string | Resource;
  index: number;
}) {
  const delay = 400 + index * 150;
  const transition = {
    type: "timing" as const,
    duration: 500,
    delay,
    easing: EASING,
  };

  if (typeof resource === "string") {
    return (
      <EaseView
        initialAnimate={EASE_INITIAL_SLIDE}
        animate={EASE_ANIMATE_SLIDE}
        transition={transition}
      >
        <View className="rounded-xl border border-foreground/10 bg-surface px-4 py-3.5">
          <AppText className="text-sm font-light text-foreground/70">
            {resource}
          </AppText>
        </View>
      </EaseView>
    );
  }

  const isTappable =
    resource.type === "phone" ||
    resource.type === "url" ||
    resource.type === "email";

  const handlePress = () => {
    playSoftPress();
    if (resource.type === "phone") {
      Linking.openURL(`tel:${resource.value}`);
    } else if (resource.type === "url") {
      Linking.openURL(resource.value);
    } else if (resource.type === "email") {
      Linking.openURL(`mailto:${resource.value}`);
    }
  };

  const isXolace = resource.source === "xolace_support";

  const inner = (
    <View
      className={`rounded-xl border px-4 py-3.5 ${isXolace ? "border-accent/30 bg-accent/10" : "border-foreground/10 bg-surface"}`}
    >
      <View className="flex-row items-center justify-between">
        <AppText
          className={`flex-1 text-sm ${isXolace ? "text-accent" : "text-foreground"}`}
        >
          {resource.label}
        </AppText>
        {isTappable && (
          <AppText
            className={`ml-3 text-xs ${isXolace ? "text-accent/70" : "text-accent"}`}
          >
            {resource.type === "phone"
              ? resource.value
              : resource.type === "email"
                ? resource.value
                : "Open →"}
          </AppText>
        )}
      </View>
      {resource.description && (
        <AppText className="mt-0.5 text-xs font-light text-foreground/40">
          {resource.description}
        </AppText>
      )}
      {resource.type === "text" && (
        <AppText className="mt-1 text-xs font-light text-foreground/65">
          {resource.value}
        </AppText>
      )}
    </View>
  );

  return (
    <EaseView
      initialAnimate={EASE_INITIAL_SLIDE}
      animate={EASE_ANIMATE_SLIDE}
      transition={transition}
    >
      {isTappable ? (
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={resource.label}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </EaseView>
  );
}

export const EscalationState = ({
  mirror,
  resources,
  onEngage,
  onDismiss,
  onContinue,
}: Props) => {
  const [phase, setPhase] = useState<"prompt" | "resources">("prompt");

  useEffect(() => {
    Presets.peal();
  }, []);

  const seenTransition = {
    type: "timing" as const,
    duration: 500,
    delay: 400 + (resources?.length ?? 0) * 150,
    easing: EASING,
  };

  if (phase === "resources") {
    return (
      <View className="flex-1 justify-center px-7">
        <EaseView
          initialAnimate={EASE_INITIAL_FADE}
          animate={EASE_ANIMATE_FADE}
          transition={EASE_RESOURCES_HEADER}
          className="mb-5"
        >
          <AppText className="mb-1 text-xs uppercase tracking-widest text-foreground/20">
            Support resources
          </AppText>
          <AppText className="text-base font-light leading-7 text-foreground/65">
            These are here whenever you need them.
          </AppText>
        </EaseView>

        <View className="mb-6 gap-2.5">
          {(resources ?? []).map((resource, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <ResourceItem key={i} resource={resource} index={i} />
          ))}
        </View>

        <EaseView
          initialAnimate={EASE_INITIAL_SLIDE}
          animate={EASE_ANIMATE_SLIDE}
          transition={seenTransition}
        >
          <Pressable
            onPress={async () => {
              playAffirmativePress();
              await onContinue();
            }}
            accessibilityRole="button"
            accessibilityLabel="I've seen these"
            className="rounded-xl border border-warning/30 bg-warning/10 px-6 py-3.5"
          >
            <AppText className="text-sm text-warning">
              I&apos;ve seen these
            </AppText>
          </Pressable>
        </EaseView>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center px-7">
      <EaseView
        initialAnimate={EASE_INITIAL_FADE}
        animate={EASE_ANIMATE_FADE}
        transition={EASE_PROMPT_MIRROR}
      >
        <AppText className="mb-2 text-xs uppercase tracking-widest text-foreground/20">
          Your mirror
        </AppText>
        <AppText
          className="mb-6 text-base italic leading-7 text-foreground/30"
          selectable
        >
          &ldquo;{removeEmDash(mirror)}&rdquo;
        </AppText>
      </EaseView>

      <EaseView
        initialAnimate={EASE_INITIAL_FADE}
        animate={EASE_ANIMATE_FADE}
        transition={EASE_PROMPT_MSG}
        className="mb-8 border-l-2 border-warning pl-4"
      >
        <AppText className="mb-3 text-base font-light leading-7 text-foreground">
          I hear you. What you&apos;re carrying right now sounds really heavy,
          heavier than a regular tough day.
        </AppText>
        <AppText className="text-base font-light leading-7 text-foreground/55">
          There are people who are trained specifically for moments like this.
          Would you like me to help you find the right support?
        </AppText>
      </EaseView>

      <View className="gap-3">
        <EaseView
          initialAnimate={EASE_INITIAL_SLIDE}
          animate={EASE_ANIMATE_SLIDE}
          transition={EASE_ENGAGE_BTN}
        >
          <Pressable
            onPress={async () => {
              playAffirmativePress();
              await onEngage();
              setPhase("resources");
            }}
            accessibilityRole="button"
            accessibilityLabel="Yes, show me some resources"
            className="rounded-xl border border-warning/30 bg-warning/10 px-6 py-3.5"
          >
            <AppText className="text-sm text-warning">
              Yes, show me some resources
            </AppText>
          </Pressable>
        </EaseView>

        <EaseView
          initialAnimate={EASE_INITIAL_SLIDE}
          animate={EASE_ANIMATE_SLIDE}
          transition={EASE_DISMISS_BTN}
        >
          <Pressable
            onPress={async () => {
              playSoftPress();
              await onDismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel="Not right now, but thank you"
            className="rounded-xl border border-foreground/10 bg-transparent px-6 py-3.5"
          >
            <AppText className="text-sm font-light text-foreground/55">
              Not right now, but thank you
            </AppText>
          </Pressable>
        </EaseView>
      </View>
    </View>
  );
};
