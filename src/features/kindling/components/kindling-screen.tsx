import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMutation, useQuery } from "convex/react";
import { useThemeColor, useToast } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { ConfirmationDialog } from "@/src/components/shared/confirmation-dialog";
import { MorphLoader } from "@/src/components/shared/loader/morph/morph-loader";
import { trackLibrary } from "@/src/features/library/analytics";
import { useLargeHeaderOptions } from "@/src/lib/navigation-options";
import { playSoftPress, playTextureSelect } from "@/src/lib/haptics";
import { twigBrowseHref, twigHref, twigSlug, type Twig } from "../twig-presentation";
import { useXolacerTwigHref } from "../use-xolacer-twig-href";
import { KindlingTrail } from "./kindling-trail";
import { TwigSheet } from "./twig-sheet";

/**
 * The active-kindling screen (docs/paths-v1.md §9.1, #333) — the Lantern
 * trail: header progress line, then one stop per twig down a winding trail
 * to Flux's fire, with the open twig floating over the bottom.
 * Only ever waits on its own query; generation runs off `completeSession`.
 */
export function KindlingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const posthog = usePostHog();
  const { toast } = useToast();
  const foreground = useThemeColor("foreground") as string;
  const headerOptions = {
    ...useLargeHeaderOptions(),
    headerShown: true,
    title: "Your kindling",
    headerBackButtonDisplayMode: "minimal" as const,
  };

  const kindling = useQuery(api.paths.getActive, { withRead: true, withTry: true });
  const skipStep = useMutation(api.paths.skipStep);
  const completeStep = useMutation(api.paths.completeStep);
  const dismiss = useMutation(api.paths.dismiss);
  const xolacerTwigHref = useXolacerTwigHref();
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [openId, setOpenId] = useState<Twig["_id"]>();
  const [sheetHeight, setSheetHeight] = useState<number>();

  useEffect(() => {
    if (!kindling) return;
    posthog.capture("path_opened", { pathId: kindling._id });
    for (const twig of kindling.twigs) {
      const slug = twigSlug(twig);
      if (twig.kind === "read" && slug) trackLibrary(posthog, "library_twig_shown", { slug, state: twig.state });
    }
    // Once per landing, not per re-render of the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindling?._id]);

  const handleBegin = async (twig: Twig) => {
    if (!kindling) return;
    playSoftPress();
    // Try-this happens away from the app: "I did this" is the tend (#567).
    if (twig.kind === "try") {
      try {
        await completeStep({ stepId: twig._id });
      } catch {
        toast.show({ label: "Couldn't mark that", description: "Try again in a moment." });
      }
      return;
    }
    const href = twig.kind === "xolacer" ? await xolacerTwigHref(twig, kindling.sessionId) : twigHref(twig, kindling.sessionId);
    if (!href) {
      toast.show({ label: "Not quite ready", description: "Playback is on its way." });
      return;
    }
    posthog.capture("step_started", { pathId: kindling._id, actionType: twig.actionType });
    router.push(href);
  };

  // One-off listening (§9.6): no `step_started`, no `stepId` — the binding
  // stays as it is and only "Not for me" says the track was wrong.
  const handleBrowseMore = (twig: Twig) => {
    const href = twigBrowseHref(twig);
    if (!href) return;
    playSoftPress();
    // Lands the Browse hub under the topic, so back and a tab re-tap reach it.
    router.push(href, { withAnchor: true });
  };

  const handleSkip = async (twig: Twig) => {
    playSoftPress();
    try {
      await skipStep({ stepId: twig._id });
    } catch {
      toast.show({ label: "Couldn't skip that", description: "Try again in a moment." });
    }
  };

  const handleDismiss = async () => {
    if (!kindling) return;
    setConfirmDismiss(false);
    // Pop before the subscription flips to null, or the empty state flashes.
    router.back();
    try {
      await dismiss({ pathId: kindling._id });
    } catch {
      toast.show({ label: "Couldn't put it out", description: "Try again in a moment." });
    }
  };

  const tended = kindling ? kindling.twigs.filter((t) => t.state === "done").length : 0;
  // The tapped twig, else the first one still waiting, else the first.
  const open = kindling
    ? (kindling.twigs.find((t) => t._id === openId) ??
      kindling.twigs.find((t) => t.state === "pending") ??
      kindling.twigs[0])
    : undefined;

  // One ScrollView as the root for every state: UIKit collapses the large
  // title only when the screen's first native child is the scroll view, and
  // it binds once — swapping a loading View for it later leaves it unbound.
  return (
    <>
      <Stack.Screen options={headerOptions} />
      {kindling ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={() => setConfirmDismiss(true)}>
            Dismiss
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}

      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="grow"
        // Clear the floating sheet (offset 12 + 28 breathing room); 260 until it measures.
        contentContainerStyle={{
          paddingBottom: insets.bottom + (open ? (sheetHeight ? sheetHeight + 40 : 260) : 40),
        }}
      >
        {kindling === undefined ? (
          <View className="flex-1 items-center justify-center">
            <MorphLoader />
            <AppText className="mt-6 text-sm text-muted">Setting up your kindling…</AppText>
          </View>
        ) : kindling === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <SymbolView
              name={{ ios: "leaf", android: "eco", web: "eco" }}
              size={40}
              tintColor={foreground}
            />
            <AppText className="mt-4 text-center text-[15px] text-muted">
              When a session leaves something to sit with, a little kindling shows up here.
            </AppText>
          </View>
        ) : (
          <>
            <View className="px-5 pb-2">
              <AppText className="text-[15px] text-muted">
                A few things to try, from what your last session held.
              </AppText>
              <View className="mt-4 flex-row items-center gap-3">
                <AppText className="text-[13px] font-medium text-muted">
                  {tended} of {kindling.twigs.length} tended
                </AppText>
                <View className="flex-1 flex-row gap-1.5">
                  {kindling.twigs.map((t) => (
                    <View
                      key={t._id}
                      className={`h-1.5 flex-1 rounded-full ${
                        t.state === "done"
                          ? "bg-ember"
                          : t.state === "skipped"
                            ? "bg-border"
                            : "bg-surface-secondary"
                      }`}
                    />
                  ))}
                </View>
              </View>
            </View>

            <KindlingTrail
              twigs={kindling.twigs}
              openId={open?._id}
              onOpen={(twig) => {
                // Only a change of stop ticks; re-tapping the open one is silent.
                if (twig._id === open?._id) return;
                playTextureSelect();
                setOpenId(twig._id);
              }}
            />
          </>
        )}
      </ScrollView>

      {open ? (
        <TwigSheet
          twig={open}
          bottom={insets.bottom + 12}
          onBegin={() => handleBegin(open)}
          onSkip={() => handleSkip(open)}
          onBrowseMore={() => handleBrowseMore(open)}
          onHeight={setSheetHeight}
        />
      ) : null}

      <ConfirmationDialog
        isOpen={confirmDismiss}
        onOpenChange={setConfirmDismiss}
        title="Put this kindling out?"
        description="Anything you haven't tended stays untended. A new one comes with your next session."
        confirmLabel="Dismiss"
        onConfirm={handleDismiss}
      />
    </>
  );
}
