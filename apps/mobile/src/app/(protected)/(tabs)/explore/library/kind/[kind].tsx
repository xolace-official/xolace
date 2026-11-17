import { useLocalSearchParams } from "expo-router";
import { isKind } from "@/features/lantern/lantern-model";
import { ListData } from "@/features/lantern/lists/list-data";
import { ListScreen } from "@/features/lantern/lists/list-screen";
import { ReturnTo } from "@/lib/return-to";

/** Explainers, Advice or Stories. */
export default function LanternKindRoute() {
	const { kind } = useLocalSearchParams<{ kind: string }>();
	// A mistyped deep link lands on Lantern's home rather than an argument error.
	if (!isKind(kind)) {
		return <ReturnTo href="/explore/library" />;
	}
	return (
		<ListData of={{ kind }}>
			<ListScreen />
		</ListData>
	);
}
