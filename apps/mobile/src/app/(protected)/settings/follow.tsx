import { FollowData } from "@/features/settings/follow/follow-data";
import { FollowScreen } from "@/features/settings/follow/follow-screen";

export default function FollowRoute() {
	return (
		<FollowData>
			<FollowScreen />
		</FollowData>
	);
}
