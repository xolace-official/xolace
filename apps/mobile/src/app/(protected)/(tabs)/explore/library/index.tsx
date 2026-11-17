import { HomeData } from "@/features/lantern/home/home-data";
import { HomeScreen } from "@/features/lantern/home/home-screen";

/** Lantern's home, inside Explore's stack. */
export default function LanternHomeRoute() {
	return (
		<HomeData>
			<HomeScreen />
		</HomeData>
	);
}
