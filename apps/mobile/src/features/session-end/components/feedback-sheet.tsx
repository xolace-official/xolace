import type { ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { BottomSheet, Button, CloseButton, PressableFeedback, useBottomSheetAwareHandlers, useThemeColor } from "heroui-native";
import { BottomSheetTextInput, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { BottomSheetBlurOverlay } from "@/src/components/bottom-sheet-blur-overlay";
import { AppText } from "@/src/components/shared/app-text";

// ─── Frame ────────────────────────────────────────────────────────────────────

type FrameProps = {
  snapPoints?: string[];
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  // Pass "interactive" for sheets that contain a text input.
  // "extend" is a no-op with enableDynamicSizing (highest detent === current position).
  keyboardBehavior?: "extend" | "interactive" | "fillParent";
};

function FeedbackSheetFrame({ snapPoints, isOpen, onClose, children, keyboardBehavior }: FrameProps) {
  const dynamic = !snapPoints;
  const { height: windowHeight } = useWindowDimensions();

  // When the sheet has an input, we need a BottomSheetScrollView so content can
  // scroll into view after the sheet shifts up in "interactive" keyboard mode.
  // maxHeight bounds the scroll container so gorhom's dynamic sizing stays compact
  // initially (small content < maxHeight) but becomes scrollable once full content
  // (chips + input) exceeds it.
  const maxScrollHeight = windowHeight * 0.60;

  const innerContent = keyboardBehavior ? (
    <BottomSheetScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={[styles.scrollView, { maxHeight: maxScrollHeight }]}
    >
      <View className="px-6 pt-2 pb-10 gap-5">
        {children}
      </View>
    </BottomSheetScrollView>
  ) : (
    <View className="px-6 pt-2 pb-10 gap-5">
      {children}
    </View>
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheetBlurOverlay />
        <BottomSheet.Content
          accessible={false}
          {...(snapPoints ? { snapPoints } : {})}
          enableOverDrag={false}
          enableDynamicSizing={dynamic}
          keyboardBehavior={keyboardBehavior}
          keyboardBlurBehavior={keyboardBehavior ? "restore" : undefined}
          backgroundClassName="bg-background"
          handleIndicatorClassName="bg-foreground/20"
        >
          {innerContent}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

type HeaderProps = {
  children: ReactNode;
  subtitle?: string;
  // Renders an explicit close affordance. Pass it on any sheet the user can
  // reach without another exit — the backdrop and pan-down are the only other
  // ways out, and if the sheet ever mis-snaps low neither is obvious.
  onDismiss?: () => void;
};

function FeedbackSheetHeader({ children, subtitle, onDismiss }: HeaderProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="flex-1">
        {typeof children === "string" ? (
          <AppText className="font-serif text-xl text-foreground mb-1">{children}</AppText>
        ) : (
          children
        )}
        {subtitle && (
          <AppText className="text-sm font-light text-foreground/40">{subtitle}</AppText>
        )}
      </View>
      {onDismiss && (
        <CloseButton onPress={onDismiss} accessibilityLabel="Dismiss" className="mt-0.5" />
      )}
    </View>
  );
}

// ─── Chips ────────────────────────────────────────────────────────────────────

type Chip = { key: string; label: string };

type ChipsProps = {
  chips: readonly Chip[];
  selected: string | null;
  onSelect: (key: string) => void;
  // One-shot pick: once something is selected, the rest dim and stop
  // responding, so the choice reads as final while the sheet closes.
  lockOnSelect?: boolean;
};

function FeedbackSheetChips({ chips, selected, onSelect, lockOnSelect = false }: ChipsProps) {
  return (
    <View className="gap-3">
      {chips.map(({ key, label }) => {
        const locked = lockOnSelect && selected !== null;
        return (
        <PressableFeedback
          key={key}
          onPress={() => onSelect(key)}
          isDisabled={locked}
          accessibilityRole="radio"
          accessibilityLabel={label}
          accessibilityState={{ selected: selected === key, disabled: locked }}
          className={`w-full py-4 rounded-2xl border items-center ${
            selected === key
              ? "border-accent/40 bg-accent/10"
              : "border-border/65 bg-surface/40"
          } ${locked && selected !== key ? "opacity-40" : ""}`}
        >
          <AppText
            className={`text-sm ${
              selected === key
                ? "font-medium text-accent"
                : "font-light text-foreground/70"
            }`}
          >
            {label}
          </AppText>
        </PressableFeedback>
        );
      })}
    </View>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

type InputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
};

function FeedbackSheetInput({ value, onChangeText, placeholder, maxLength = 300 }: InputProps) {
  const foreground = useThemeColor("foreground") as string;
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <BottomSheetTextInput
      placeholder={placeholder ?? "Anything you want us to know? Tap here"}
      accessibilityLabel="Additional context"
      value={value}
      onChangeText={onChangeText}
      maxLength={maxLength}
      placeholderTextColor={`${foreground}4D`}
      returnKeyType="done"
      onFocus={onFocus}
      onBlur={onBlur}
      style={[styles.input, { color: foreground }]}
    />
  );
}

// ─── Submit ───────────────────────────────────────────────────────────────────

type SubmitProps = {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
};

function FeedbackSheetSubmit({ onPress, disabled = false, label = "Done" }: SubmitProps) {
  return (
    <Button
      onPress={onPress}
      isDisabled={disabled}
      accessibilityLabel={label}
      variant="ghost"
      size="sm"
      className="self-start rounded-xl bg-accent/10"
    >
      <Button.Label className="text-xs font-medium text-accent">{label}</Button.Label>
    </Button>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 14, paddingHorizontal: 4, paddingVertical: 8 },
  scrollView: { flexGrow: 0 },
});

// ─── Export ───────────────────────────────────────────────────────────────────

export const FeedbackSheet = {
  Frame: FeedbackSheetFrame,
  Header: FeedbackSheetHeader,
  Chips: FeedbackSheetChips,
  Input: FeedbackSheetInput,
  Submit: FeedbackSheetSubmit,
};
