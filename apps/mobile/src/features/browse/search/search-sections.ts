/** Browse search's result sections (#550, #551), shared by the results and each See all. */
import { FAMILY_LABEL } from "@/features/browse/components/track-row";

export type SearchSection = "lantern" | "support" | "music" | "places";

export const SECTION_TITLE: Record<SearchSection, string> = {
	lantern: "Lantern",
	...FAMILY_LABEL,
	places: "Hubs & topics",
};
