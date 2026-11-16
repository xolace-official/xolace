import { PlaceholderScreen } from "@/components/shared/placeholder-screen";
import { EXPLORE_COPY } from "@/features/explore/copy";

/** The v2 shell's Explore tab, standing in until its screen PR (S7) replaces it. */
export function ExploreScreen() {
	return (
		<PlaceholderScreen
			note={EXPLORE_COPY.placeholder}
			title={EXPLORE_COPY.title}
		/>
	);
}
