import { MirrorData } from "@/features/settings/mirror/mirror-data";
import { MirrorScreen } from "@/features/settings/mirror/mirror-screen";

export default function MirrorRoute() {
	return (
		<MirrorData>
			<MirrorScreen />
		</MirrorData>
	);
}
