import { useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
	PressableFeedback,
	Select,
	useThemeColor,
	useToast,
} from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { Linking, ScrollView, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { ResourceItem } from "@/src/components/shared/resource-item";
import { COUNTRY_RESOURCES, LAST_UPDATED } from "./data";
import type { CountryCode } from "./types";
import { useCrisisResources } from "./use-crisis-resources";

type SelectOption = { value: string; label: string } | undefined;

const COUNTRY_OPTIONS = (Object.keys(COUNTRY_RESOURCES) as CountryCode[]).map(
	(code) => ({
		label: `${COUNTRY_RESOURCES[code].flag} ${COUNTRY_RESOURCES[code].name}`,
		value: code,
	})
);

const CONTENT_CONTAINER_STYLE = { paddingBottom: 48, paddingHorizontal: 24 };
const INTRO_INITIAL = { opacity: 0, translateY: 10 };
const INTRO_ANIMATE = { opacity: 1, translateY: 0 };
const INTRO_TRANSITION = {
	delay: 100,
	duration: 500,
	easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
	type: "timing" as const,
};
const COUNTRY_SNAP_POINTS = ["40%"];
const PHONE_ICON = { android: "phone", ios: "phone.fill" } as const;

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
				: null
		);
	};

	const handleEmergencyCall = async () => {
		if (!countryData) {
			return;
		}
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
			posthog.capture("emergency_call_tapped", {
				country: selectedCountry,
				from: from ?? null,
			});
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
				country: selectedCountry,
				from: from ?? null,
				source: resource.source,
				type: resource.type,
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
				<AppText className="mb-2 text-foreground/50 text-sm">
					Showing resources for {countryData.name} {countryData.flag}
				</AppText>
			)}

			<Select
				onValueChange={handleCountryChange}
				presentation="bottom-sheet"
				value={selectValue}
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
							<Select.Item key={opt.value} label={opt.label} value={opt.value}>
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
			contentContainerStyle={CONTENT_CONTAINER_STYLE}
			contentInsetAdjustmentBehavior="automatic"
		>
			<EaseView
				animate={INTRO_ANIMATE}
				initialAnimate={INTRO_INITIAL}
				transition={INTRO_TRANSITION}
			>
				<AppText className="pb-6 text-foreground/50 text-sm">
					If you need support right now, you&apos;re in the right place.
				</AppText>

				{countryData ? (
					<PressableFeedback
						accessibilityHint="Opens your phone dialer"
						accessibilityLabel={`Call emergency services: ${countryData.emergencyNumber}`}
						accessibilityRole="button"
						onPress={handleEmergencyCall}
					>
						<View className="w-full flex-row items-center gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-5">
							<SymbolView
								name={PHONE_ICON}
								size={20}
								tintColor={warningColor}
							/>
							<View className="flex-1">
								<AppText className="text-warning/70 text-xs uppercase tracking-wider">
									Emergency
								</AppText>
								<AppText className="font-medium text-warning text-xl">
									{countryData.emergencyNumber}
								</AppText>
							</View>
							<AppText className="text-warning/80 text-xs">Call →</AppText>
						</View>
					</PressableFeedback>
				) : (
					<AppText className="pb-6 text-foreground/40 text-sm">
						Select your country below to see emergency services.
					</AppText>
				)}
			</EaseView>

			<View className="mt-6">{resourcesContent}</View>

			{selectedCountry && countryData && (
				<View className="mt-5 gap-2.5">
					{countryData.resources.map((resource, i) => (
						<ResourceItem
							index={i}
							key={`${resource.type}-${resource.value}`}
							onTap={handleResourceTap}
							resource={resource}
						/>
					))}
				</View>
			)}

			<View className="mt-8">
				<AppText className="text-foreground/40 text-xs">
					Last updated: {LAST_UPDATED}
				</AppText>
				<AppText className="mt-0.5 text-foreground/40 text-xs">
					Xolace Inc assumes no responsibility or liability for the professional
					ability, reputation, or quality of services provided by the entities
					or individuals listed above. Inclusion on this list does not
					constitute an endorsement by Xolace Inc. The order does not imply any
					ranking or evaluation. Xolace Inc cannot vouch for the contact
					information&apos;s accuracy;
				</AppText>
				<PressableFeedback
					accessibilityLabel="Email support@xolaceinc.com to report an error"
					accessibilityRole="link"
					hitSlop={8}
					onPress={handleDisclaimerEmail}
				>
					<AppText className="mt-0.5 text-foreground/40 text-xs">
						Found an error? support@xolaceinc.com
					</AppText>
				</PressableFeedback>
			</View>
		</ScrollView>
	);
}
