import { Linking, ScrollView, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { EaseView } from "react-native-ease/uniwind";
import { useLocalSearchParams } from "expo-router";
import {
  PressableFeedback,
  Select,
  useThemeColor,
  useToast,
} from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { AppText } from "@/src/components/shared/app-text";
import { ResourceItem } from "@/src/components/shared/resource-item";
import { useCrisisResources } from "./use-crisis-resources";
import { COUNTRY_RESOURCES, LAST_UPDATED } from "./data";
import type { CountryCode } from "./types";

type SelectOption = { value: string; label: string } | undefined;

const COUNTRY_OPTIONS = (Object.keys(COUNTRY_RESOURCES) as CountryCode[]).map(
  (code) => ({
    value: code,
    label: `${COUNTRY_RESOURCES[code].flag} ${COUNTRY_RESOURCES[code].name}`,
  }),
);

const CONTENT_CONTAINER_STYLE = { paddingHorizontal: 24, paddingBottom: 48 };
const INTRO_INITIAL = { opacity: 0, translateY: 10 };
const INTRO_ANIMATE = { opacity: 1, translateY: 0 };
const INTRO_TRANSITION = {
  type: "timing" as const,
  duration: 500,
  delay: 100,
  easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
};
const COUNTRY_SNAP_POINTS = ["40%"];
const PHONE_ICON = { ios: "phone.fill", android: "phone" } as const;

export function CrisisResourcesScreen() {
  const { selectedCountry, setCountry, countryData } = useCrisisResources();
  const warningColor = useThemeColor("warning") as string;
  const { toast } = useToast();
  const posthog = usePostHog();
  // Which screen sent the person here (talk, library, quote_reply, ...).
  const { from } = useLocalSearchParams<{ from?: string }>();

  const selectValue = selectedCountry
    ? COUNTRY_OPTIONS.find((o) => o.value === selectedCountry)
    : undefined;

  const handleCountryChange = (option: SelectOption) => {
    const code = option?.value;
    setCountry(
      code && COUNTRY_RESOURCES[code as CountryCode]
        ? (code as CountryCode)
        : null,
    );
  };

  const handleEmergencyCall = async () => {
    if (!countryData) return;
    const url = `tel:${countryData.emergencyNumber}`;
    let canOpen: boolean;
    try {
      canOpen = await Linking.canOpenURL(url);
    } catch (error) {
      void error;
      toast.show({
        label: "Phone calls not supported on this device",
        variant: "default",
      });
      return;
    }
    if (!canOpen) {
      toast.show({
        label: "Phone calls not supported on this device",
        variant: "default",
      });
      return;
    }
    await Linking.openURL(url).catch(() => {
      toast.show({
        label: "Unable to open dialer. Please dial manually.",
        variant: "default",
      });
    });
    try {
      posthog.capture("emergency_call_tapped", { country: selectedCountry, from: from ?? null });
    } catch (error) {
      void error;
    }
  };

  const handleResourceTap = (resource: {
    type: string;
    source: string;
    label: string;
    value: string;
  }) => {
    try {
      posthog.capture("crisis_resource_tapped", {
        type: resource.type,
        source: resource.source,
        country: selectedCountry,
        from: from ?? null,
      });
    } catch (error) {
      void error;
    }
  };

  const handleDisclaimerEmail = async () => {
    const url = "mailto:support@xolaceinc.com";
    let canOpen: boolean;
    try {
      canOpen = await Linking.canOpenURL(url);
    } catch {
      toast.show({ label: "No mail app found", variant: "default" });
      return;
    }
    if (!canOpen) {
      toast.show({ label: "No mail app found", variant: "default" });
      return;
    }
    await Linking.openURL(url).catch(() => {
      toast.show({ label: "Unable to open mail app.", variant: "default" });
    });
  };

  const resourcesContent = (
    <>
      {selectedCountry && countryData && (
        <AppText className="text-sm text-foreground/50 mb-2">
          Showing resources for {countryData.name} {countryData.flag}
        </AppText>
      )}

      <Select
        presentation="bottom-sheet"
        value={selectValue}
        onValueChange={handleCountryChange}
      >
        <Select.Trigger className="w-full">
          <Select.Value placeholder="Select your country" />
          <Select.TriggerIndicator />
        </Select.Trigger>
        <Select.Portal>
          <Select.Overlay />
          <Select.Content
            presentation="bottom-sheet"
            snapPoints={COUNTRY_SNAP_POINTS}
          >
            <Select.ListLabel>Select your country</Select.ListLabel>
            {COUNTRY_OPTIONS.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                label={opt.label}
              >
                <Select.ItemLabel className="flex-1" />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Portal>
      </Select>
    </>
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={CONTENT_CONTAINER_STYLE}
    >
      <EaseView
        initialAnimate={INTRO_INITIAL}
        animate={INTRO_ANIMATE}
        transition={INTRO_TRANSITION}
      >
        <AppText className="text-sm text-foreground/50 pb-6">
          If you need support right now, you&apos;re in the right place.
        </AppText>

        {countryData ? (
          <PressableFeedback
            onPress={handleEmergencyCall}
            accessibilityRole="button"
            accessibilityLabel={`Call emergency services: ${countryData.emergencyNumber}`}
            accessibilityHint="Opens your phone dialer"
          >
            <View className="w-full rounded-2xl border border-warning/30 bg-warning/10 px-5 py-5 flex-row items-center gap-3">
              <SymbolView
                name={PHONE_ICON}
                size={20}
                tintColor={warningColor}
              />
              <View className="flex-1">
                <AppText className="text-xs text-warning/70 uppercase tracking-wider">
                  Emergency
                </AppText>
                <AppText className="text-xl font-medium text-warning">
                  {countryData.emergencyNumber}
                </AppText>
              </View>
              <AppText className="text-xs text-warning/80">Call →</AppText>
            </View>
          </PressableFeedback>
        ) : (
          <AppText className="text-sm text-foreground/40 pb-6">
            Select your country below to see emergency services.
          </AppText>
        )}
      </EaseView>

      <View className="mt-6">{resourcesContent}</View>

      {selectedCountry && countryData && (
        <View className="mt-5 gap-2.5">
          {countryData.resources.map((resource, i) => (
            <ResourceItem
              key={`${resource.type}-${resource.value}`}
              resource={resource}
              index={i}
              onTap={handleResourceTap}
            />
          ))}
        </View>
      )}

      <View className="mt-8">
        <AppText className="text-xs text-foreground/40">
          Last updated: {LAST_UPDATED}
        </AppText>
        <AppText className="text-xs text-foreground/40 mt-0.5">
          Xolace Inc assumes no responsibility or liability for the professional
          ability, reputation, or quality of services provided by the entities
          or individuals listed above. Inclusion on this list does not
          constitute an endorsement by Xolace Inc. The order does not imply any
          ranking or evaluation. Xolace Inc cannot vouch for the contact
          information&apos;s accuracy;
        </AppText>
        <PressableFeedback
          onPress={handleDisclaimerEmail}
          accessibilityRole="link"
          accessibilityLabel="Email support@xolaceinc.com to report an error"
          hitSlop={8}
        >
          <AppText className="text-xs text-foreground/40 mt-0.5">
            Found an error? support@xolaceinc.com
          </AppText>
        </PressableFeedback>
      </View>
    </ScrollView>
  );
}
