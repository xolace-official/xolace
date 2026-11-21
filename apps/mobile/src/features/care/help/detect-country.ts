import {
	type CountryCode,
	isCountryCode,
} from "@xolace/backend/convex/lib/crisisResources";
import * as Localization from "expo-localization";

export function detectCountry(): CountryCode | null {
	const region = Localization.getLocales()[0]?.regionCode;
	return isCountryCode(region) ? region : null;
}
