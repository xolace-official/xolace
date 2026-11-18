/** Mirror's fixture adapter: the real screen under a provider filled from fixtures. */
import { MIRROR_ACTIONS } from "@/features/settings/mirror/dev/fixtures";
import {
	MirrorProvider,
	type MirrorSettings,
} from "@/features/settings/mirror/mirror-data";
import {
	type MirrorOpens,
	MirrorScreen,
} from "@/features/settings/mirror/mirror-screen";

export function FixtureMirror({
	state,
	opens,
}: {
	state: MirrorSettings["state"];
	opens?: MirrorOpens;
}) {
	return (
		<MirrorProvider value={{ actions: MIRROR_ACTIONS, state }}>
			<MirrorScreen opens={opens} />
		</MirrorProvider>
	);
}
