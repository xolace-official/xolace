import { getCalendars, getLocales } from "expo-localization";
import type { Clock } from "./list/chats-model";

export function deviceClock(): Clock {
	const uses24 = getCalendars()[0]?.uses24hourClock;
	return {
		hour12: typeof uses24 === "boolean" ? !uses24 : undefined,
		locale: getLocales()[0]?.languageTag,
	};
}
