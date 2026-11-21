import { FamilyListData } from "@/features/explore/list/family-list-data";
import { FamilyListScreen } from "@/features/explore/list/family-list-screen";

export default function FamilyListRoute() {
	return (
		<FamilyListData>
			<FamilyListScreen />
		</FamilyListData>
	);
}
