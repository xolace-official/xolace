import { PlaceholderScreen } from "@/components/shared/placeholder-screen";
import { TODAY_COPY } from "@/features/today/copy";

/** The v2 shell's Today tab, standing in until its screen PR (S1) replaces it. */
export function TodayScreen() {
	return (
		<PlaceholderScreen note={TODAY_COPY.placeholder} title={TODAY_COPY.title} />
	);
}
