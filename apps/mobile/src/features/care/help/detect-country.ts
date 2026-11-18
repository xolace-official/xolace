import {
	type CountryCode,
	isCountryCode,
} from "@xolace/backend/convex/lib/crisisResources";
import * as Localization from "expo-localization";

/** The device's market if the crisis list has lines for it, else null. */
export function detectCountry(): CountryCode | null {
	const region = Localization.getLocales()[0]?.regionCode;
	return isCountryCode(region) ? region : null;
}
