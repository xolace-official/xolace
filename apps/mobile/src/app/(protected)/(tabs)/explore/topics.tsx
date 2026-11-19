import { TopicsData } from "@/features/explore/topics/topics-data";
import { TopicsScreen } from "@/features/explore/topics/topics-screen";

export default function TopicsRoute() {
	return (
		<TopicsData>
			<TopicsScreen />
		</TopicsData>
	);
}
