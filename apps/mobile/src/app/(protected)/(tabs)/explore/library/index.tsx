import { HomeData } from "@/features/lantern/home/home-data";
import { HomeScreen } from "@/features/lantern/home/home-screen";

export default function LanternHomeRoute() {
	return (
		<HomeData>
			<HomeScreen />
		</HomeData>
	);
}
