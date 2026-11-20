import { useLocalSearchParams } from "expo-router";
import { isKind } from "@/features/lantern/lantern-model";
import { ListData } from "@/features/lantern/lists/list-data";
import { ListScreen } from "@/features/lantern/lists/list-screen";
import { ReturnTo } from "@/lib/return-to";

export default function LanternKindRoute() {
	const { kind } = useLocalSearchParams<{ kind: string }>();
	if (!isKind(kind)) {
		return <ReturnTo href="/explore/library" />;
	}
	return (
		<ListData of={{ kind }}>
			<ListScreen />
		</ListData>
	);
}
