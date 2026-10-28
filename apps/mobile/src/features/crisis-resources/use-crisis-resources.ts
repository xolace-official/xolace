import * as Localization from "expo-localization";
import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { COUNTRY_RESOURCES } from "@/features/crisis-resources/data";
import type {
	CountryCode,
	CountryData,
} from "@/features/crisis-resources/types";

type UseCrisisResourcesResult = {
	selectedCountry: CountryCode | null;
	setCountry: (code: CountryCode | null) => void;
	countryData: CountryData | null;
};

/** The device's market if we have resources for it, else null. */
export function detectCountry(): CountryCode | null {
	const region = Localization.getLocales()[0]?.regionCode;
	return region && COUNTRY_RESOURCES[region as CountryCode]
		? (region as CountryCode)
		: null;
}

export function useCrisisResources(): UseCrisisResourcesResult {
	const { from = "idle_button" } = useLocalSearchParams<{ from?: string }>();
	const posthog = usePostHog();

	const [selectedCountry, setCountry] = useState<CountryCode | null>(
		detectCountry
	);

	useEffect(() => {
		posthog.capture("crisis_resources_opened", {
			country: selectedCountry ?? "unrecognized",
			entry_point: from,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const countryData = selectedCountry
		? COUNTRY_RESOURCES[selectedCountry]
		: null;

	return { countryData, selectedCountry, setCountry };
}
