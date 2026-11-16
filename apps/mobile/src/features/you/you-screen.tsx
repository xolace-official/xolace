import { PlaceholderScreen } from "@/components/shared/placeholder-screen";
import { YOU_COPY } from "@/features/you/copy";

/** The v2 shell's You tab, standing in until its screen PR (S5) replaces it. */
export function YouScreen() {
	return (
		<PlaceholderScreen note={YOU_COPY.placeholder} title={YOU_COPY.title} />
	);
}
