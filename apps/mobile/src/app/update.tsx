import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { updateModeOf } from "@/features/app-update/update-model";
import { UpdateSheet } from "@/features/app-update/update-sheet";
import { STORE_URL } from "@/lib/constants/links";

export default function UpdateRoute() {
	const router = useRouter();
	const mode = updateModeOf(useLocalSearchParams().mode);
	const close = () =>
		router.canGoBack() ? router.back() : router.replace("/");
	return (
		<UpdateSheet
			mode={mode}
			onLater={close}
			onPrimary={() => {
				if (mode === "new-version") {
					if (STORE_URL) {
						Linking.openURL(STORE_URL);
					}
					return;
				}
				// No Updates.reloadAsync() here: the relaunch destroys the JS runtime while JSI
				// promises are in flight and their destructors deref it (EXC_BAD_ACCESS on iOS). The
				// fetched update applies on the next cold start instead.
				close();
			}}
		/>
	);
}
