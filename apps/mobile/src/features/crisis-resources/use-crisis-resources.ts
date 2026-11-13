import {
	COUNTRY_RESOURCES,
	type CountryCode,
	type CountryData,
	isCountryCode,
} from "@xolace/backend/convex/lib/crisisResources";
import * as Localization from "expo-localization";
import { useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";

type UseCrisisResourcesResult = {
	selectedCountry: CountryCode | null;
	setCountry: (code: CountryCode | null) => void;
	countryData: CountryData | null;
};

/** The device's market if there are resources for it, else null. */
export function detectCountry(): CountryCode | null {
	const region = Localization.getLocales()[0]?.regionCode;
	return isCountryCode(region) ? region : null;
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
