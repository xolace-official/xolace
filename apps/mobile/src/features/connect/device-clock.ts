import { getCalendars, getLocales } from "expo-localization";
import type { Clock } from "./list/chats-model";

/** How this phone writes a time: its first locale, and the 12/24-hour switch in Settings, which
 * the locale alone doesn't carry. Read per render: either can change while the app runs. */
export function deviceClock(): Clock {
	const uses24 = getCalendars()[0]?.uses24hourClock;
	return {
		hour12: typeof uses24 === "boolean" ? !uses24 : undefined,
		locale: getLocales()[0]?.languageTag,
	};
}
