import type { TextInputInstance } from 'react-native';
import { useEffect, useRef, useState } from "react";
import { Pressable, Share, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import {
  Button,
  Description,
  PressableFeedback,
  TextField,
  TextArea,
  Input,
  useThemeColor,
  useToast,
} from "heroui-native";
import { EaseView } from "react-native-ease/uniwind";
import { usePostHog } from "posthog-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { useAppStore } from "@/src/store/store";
import { useBridgeDraft } from "@/src/features/trusted-bridge/hooks/use-bridge-draft";
import { BridgeIntro } from "@/src/features/trusted-bridge/components/bridge-intro";
import { BridgeQuotaHint } from "@/src/features/trusted-bridge/components/bridge-quota-hint";
import { ShimmerLoadingText } from "@/src/features/trusted-bridge/components/shimmer-loading-text";
import { BridgeDoneButton } from "@/src/features/trusted-bridge/components/bridge-done-button";
import type { Id } from "@/convex/_generated/dataModel";

type Step = "recipient" | "draft";
type Relationship = "parent" | "partner" | "friend" | "sibling";

const RELATIONSHIPS: Relationship[] = [
  "parent",
  "partner",
  "friend",
  "sibling",
];

// Address-term suggestions only where what you call them diverges from their
// name. For a friend or sibling you usually just use the name, so we skip chips.
const ADDRESS_TERMS: Record<Relationship, string[]> = {
  parent: ["Mom", "Mum", "Mama", "Dad", "Ma"],
  partner: ["babe", "love", "honey"],
  friend: [],
  sibling: ["bro", "sis", "bruh"],
};
// Mirrors the caps enforced in convex/ai/bridge.ts — the server trims to these,
// so the field stops the user at the boundary rather than silently losing text.
// The counter stays hidden until they're close, so a quiet screen stays quiet.
const MAX_NAME_LENGTH = 60;
const MAX_ADDRESS_TERM_LENGTH = 40;
const COUNTER_REVEAL_THRESHOLD = 10;

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_IN = {
  type: "timing" as const,
  duration: 400,
  delay: 80,
  easing: EASING,
};
const FADE_OUT = { opacity: 0 };
const FADE_IN = { opacity: 1 };

type Props = {
  sessionId: Id<"sessions">;
  stepId?: Id<"path_steps">;
};

export function BridgeScreen({ sessionId, stepId }: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const completeStep = useMutation(api.paths.completeStep);
  const { toast } = useToast();
  const mutedColor = (useThemeColor("foreground") as string) + "55";

  const bridgeIntroSeen = useAppStore((s) => s.bridgeIntroSeen);
  const setBridgeIntroSeen = useAppStore((s) => s.setBridgeIntroSeen);

  const [showIntro, setShowIntro] = useState(!bridgeIntroSeen);
  const [step, setStep] = useState<Step>("recipient");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [addressTerm, setAddressTerm] = useState<string | null>(null);
  const [hasShared, setHasShared] = useState(false);
  const { status, draft, setDraft, generate } = useBridgeDraft();
  const addressInputRef = useRef<TextInputInstance>(null);

  const nameRemaining = MAX_NAME_LENGTH - name.length;
  const addressRemaining = MAX_ADDRESS_TERM_LENGTH - (addressTerm?.length ?? 0);

  const selectRelationship = (rel: Relationship) => {
    setRelationship((prev) => (prev === rel ? null : rel));
    setAddressTerm(null); // terms differ per relationship — reset on change
  };

  // When a relationship is chosen, focus the address field so the newly revealed
  // section scrolls above the keyboard — otherwise it appears hidden underneath it.
  useEffect(() => {
    if (relationship) {
      const t = setTimeout(() => addressInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [relationship]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: step === "recipient" });
  }, [navigation, step]);

  const handleBegin = () => {
    setBridgeIntroSeen(true);
    setShowIntro(false);
  };

  const handleDismiss = () => {
    posthog.capture("bridge_dismissed", { step: "recipient" });
    router.replace("/");
  };

  const handleWriteTogether = () => {
    if (!name.trim()) return;
    posthog.capture("bridge_opened", { recipient_relationship: relationship });
    setHasShared(false); // fresh draft — not yet shared
    setStep("draft");
    generate(
      sessionId,
      name.trim(),
      relationship ?? undefined,
      addressTerm ?? undefined,
    );
  };

  const handleShare = async () => {
    if (!draft.trim()) return;
    try {
      const result = await Share.share({ message: draft });
      // Only treat it as shared when the sheet actually completed — this is what
      // reveals the "Done" affordance. (Android always reports sharedAction.)
      if (result.action === Share.sharedAction) {
        posthog.capture("bridge_shared", {
          recipient_relationship: relationship,
        });
        if (stepId) {
          try {
            await completeStep({ stepId });
          } catch {
            toast.show({
              label: "Couldn't save your progress. Try sharing again.",
              variant: "default",
            });
            return;
          }
        }
        setHasShared(true);
      }
    } catch {
      // share sheet cancelled
    }
  };

  const handleComplete = () => {
    posthog.capture("bridge_completed", {
      recipient_relationship: relationship,
    });
    router.replace("/");
  };

  if (showIntro) {
    return (
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <BridgeIntro onBegin={handleBegin} />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* ── Recipient step ── */}
      {step === "recipient" && (
        <View className="flex-1">
          <KeyboardAwareScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bottomOffset={110}
          >
            <EaseView
              initialAnimate={FADE_OUT}
              animate={FADE_IN}
              transition={EASE_IN}
            >
              <View className="flex-row items-center px-5 pt-4 pb-2 ">
                <Pressable
                  onPress={handleDismiss}
                  hitSlop={12}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <SymbolView
                    name={{ ios: "xmark", android: "close", web: "close" }}
                    size={18}
                    tintColor={mutedColor}
                  />
                </Pressable>
              </View>

              <View className="px-5 pt-6 gap-8">
                {/* Heading */}
                <View className="gap-2">
                  <AppText className="text-3xl text-foreground leading-10">
                    Who would you like to tell?
                  </AppText>
                  <AppText className="text-sm font-light text-foreground/40 leading-5">
                    We&apos;ll shape the message around them. We never store who
                    they are.
                  </AppText>
                </View>

                {/* Name field */}
                <TextField>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="their name or how you think of them"
                    maxLength={MAX_NAME_LENGTH}
                    autoFocus
                  />
                  {nameRemaining <= COUNTER_REVEAL_THRESHOLD && (
                    <Description>
                      {nameRemaining} characters left
                    </Description>
                  )}
                </TextField>

                {/* Relationship section */}
                <View className="gap-3">
                  <View className="gap-0.5">
                    <AppText className="text-sm font-medium text-foreground/70">
                      Their relationship to you
                    </AppText>
                    <AppText className="text-xs font-light text-foreground/35 leading-4">
                      Optional - helps us find the right tone for your words
                    </AppText>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {RELATIONSHIPS.map((rel) => (
                      <PressableFeedback
                        key={rel}
                        onPress={() => selectRelationship(rel)}
                        accessibilityLabel={rel}
                        accessibilityRole="button"
                        accessibilityState={{ selected: relationship === rel }}
                        className={`rounded-full border px-4 py-2 ${relationship === rel ? "border-accent/40 bg-accent/10" : "border-border/55 bg-surface/30"}`}
                      >
                        <AppText
                          className={`text-sm ${relationship === rel ? "text-accent font-medium" : "text-foreground/55 font-light"}`}
                        >
                          {rel}
                        </AppText>
                      </PressableFeedback>
                    ))}
                  </View>
                </View>

                {/* Address-term section — chips suggest, field captures the long tail */}
                {relationship && (
                  <View className="gap-3">
                    <View className="gap-0.5">
                      <AppText className="text-sm font-medium text-foreground/70">
                        What do you call them?
                      </AppText>
                      <AppText className="text-xs font-light text-foreground/35 leading-4">
                        Optional - the message will open with exactly this word,
                        the way you greet them (like &ldquo;Mom&rdquo;,
                        &ldquo;babe&rdquo; or &ldquo;bro&rdquo;), instead of
                        their name.
                      </AppText>
                    </View>
                    {ADDRESS_TERMS[relationship].length > 0 && (
                      <View className="flex-row flex-wrap gap-2">
                        {ADDRESS_TERMS[relationship].map((term) => (
                          <PressableFeedback
                            key={term}
                            onPress={() =>
                              setAddressTerm(addressTerm === term ? null : term)
                            }
                            accessibilityLabel={term}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: addressTerm === term,
                            }}
                            className={`rounded-full border px-4 py-2 ${addressTerm === term ? "border-accent/40 bg-accent/10" : "border-border/55 bg-surface/30"}`}
                          >
                            <AppText
                              className={`text-sm ${addressTerm === term ? "text-accent font-medium" : "text-foreground/55 font-light"}`}
                            >
                              {term}
                            </AppText>
                          </PressableFeedback>
                        ))}
                      </View>
                    )}
                    <TextField>
                      <Input
                        // heroui-native still types `ref` as the pre-0.87 TextInput class; the runtime value is the instance.
                        ref={addressInputRef as never}
                        value={addressTerm ?? ""}
                        onChangeText={(t) =>
                          setAddressTerm(t.length > 0 ? t : null)
                        }
                        placeholder="or type what you call them"
                        maxLength={MAX_ADDRESS_TERM_LENGTH}
                      />
                      {addressRemaining <= COUNTER_REVEAL_THRESHOLD && (
                        <Description>
                          {addressRemaining} characters left
                        </Description>
                      )}
                    </TextField>
                  </View>
                )}
              </View>
            </EaseView>
          </KeyboardAwareScrollView>

          {/* Sticky CTA — rides above the keyboard, tucks into the safe area when closed */}
          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <View className="px-8 pb-10 pt-2 bg-background">
              <Button
                variant="primary"
                size="lg"
                onPress={handleWriteTogether}
                isDisabled={!name.trim()}
                className="w-full"
              >
                Write this together
              </Button>
              <BridgeQuotaHint />
            </View>
          </KeyboardStickyView>
        </View>
      )}

      {/* ── Draft step ── */}
      {step === "draft" && (
        <View className="flex-1">
          {/* Nav */}
          <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
            <Pressable
              onPress={() => {
                setHasShared(false);
                setStep("recipient");
              }}
              hitSlop={12}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "arrow_back",
                  web: "arrow_back",
                }}
                size={18}
                tintColor={mutedColor}
              />
            </Pressable>
            {hasShared && <BridgeDoneButton onPress={handleComplete} />}
          </View>

          {status === "loading" ? (
            <View className="flex-1 justify-center">
              <ShimmerLoadingText name={name} />
            </View>
          ) : (
            <EaseView
              initialAnimate={FADE_OUT}
              animate={FADE_IN}
              transition={EASE_IN}
              className="flex-1"
            >
              {/* Scrollable content — keyboard-aware so the editor lifts above the keyboard */}
              <KeyboardAwareScrollView
                className="flex-1"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bottomOffset={170}
              >
                <View className="px-8 pt-4 pb-6 gap-5">
                  {/* Heading */}
                  <View className="gap-2">
                    <AppText className="text-3xl text-foreground leading-10">
                      A message for {name}.
                    </AppText>
                    <AppText className="text-sm font-light text-foreground/40 leading-5">
                      This was shaped around what you felt. Edit it until it
                      sounds like you, then share when you&apos;re ready.
                    </AppText>
                  </View>

                  {/* Error banner */}
                  {(status === "error" || status === "rate_limited") && (
                    <View className="flex-row items-start gap-3 rounded-2xl bg-surface/40 border border-border/40 px-4 py-3">
                      <SymbolView
                        name={{
                          ios:
                            status === "rate_limited"
                              ? "clock"
                              : "exclamationmark.circle",
                          android:
                            status === "rate_limited"
                              ? "schedule"
                              : "error_outline",
                          web:
                            status === "rate_limited"
                              ? "schedule"
                              : "error_outline",
                        }}
                        size={15}
                        tintColor={mutedColor}
                      />
                      <AppText className="text-xs font-light text-foreground/55 flex-1 leading-4">
                        {status === "rate_limited"
                          ? "That's every draft you have today. It comes back tomorrow, the template below is yours to edit in the meantime."
                          : "Couldn't personalize this time, but the template below is yours to edit."}
                      </AppText>
                    </View>
                  )}

                  {/* Draft text area */}
                  <TextArea
                    value={draft}
                    onChangeText={setDraft}
                    numberOfLines={8}
                    className="min-h-44"
                  />
                </View>
              </KeyboardAwareScrollView>

              {/* Bottom actions — ride above the keyboard while editing the draft */}
              <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
                <View className="px-8 pb-10 pt-3 gap-3 bg-background">
                  <View className="flex-row items-center justify-center gap-1.5">
                    <SymbolView
                      name={{ ios: "lock.fill", android: "lock", web: "lock" }}
                      size={11}
                      tintColor={mutedColor}
                    />
                    <AppText className="text-xs font-light text-foreground/30">
                      Used only to write your draft · never stored
                    </AppText>
                  </View>
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleShare}
                    className="w-full"
                  >
                    Share with {name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onPress={() => {
                      posthog.capture("bridge_dismissed", { step: "draft" });
                      router.replace("/");
                    }}
                    className="w-full"
                  >
                    Not right now
                  </Button>
                </View>
              </KeyboardStickyView>
            </EaseView>
          )}
        </View>
      )}
    </View>
  );
}
