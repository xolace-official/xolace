import { FAMILY_LABEL } from "@/features/browse/components/track-row";

export type SearchSection = "lantern" | "support" | "music" | "places";

export const SECTION_TITLE: Record<SearchSection, string> = {
	lantern: "Lantern",
	...FAMILY_LABEL,
	places: "Hubs & topics",
};
