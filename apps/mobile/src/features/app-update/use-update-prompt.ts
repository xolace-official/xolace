import { useRootNavigationState, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useOtaUpdate } from "@/helpers/hooks/use-ota-update";
import { useVersionCheck } from "@/helpers/hooks/use-version-check";
import { useAppStore } from "@/store/store";
import { mayPresent, type UpdateMode } from "./update-model";

export function useUpdatePrompt({
	gateLoading,
	presented,
	revealed,
}: {
	gateLoading: boolean;
	presented: boolean;
	revealed: boolean;
}) {
	const router = useRouter();
	const navigationReady = Boolean(useRootNavigationState()?.key);
	const setIsVersionChecked = useAppStore((s) => s.setIsVersionChecked);
	const setIsNewVersionAvailable = useAppStore(
		(s) => s.setIsNewVersionAvailable
	);
	const isVersionChecked = useAppStore((s) => s.isVersionChecked);
	const isNewVersionAvailable = useAppStore((s) => s.isNewVersionAvailable);
	const [pending, setPending] = useState<UpdateMode | null>(null);

	useVersionCheck({
		onVersionChecked: (isNew) => {
			setIsVersionChecked(true);
			setIsNewVersionAvailable(isNew);
			if (isNew) {
				setPending("new-version");
			}
		},
	});
	useOtaUpdate({
		isNewVersionAvailable,
		isVersionChecked,
		onUpdateReady: () => setPending("ota-update"),
	});

	useEffect(() => {
		const ready = {
			gateLoading,
			navigationReady,
			pending,
			presented,
			revealed,
		};
		if (!mayPresent(ready)) {
			return;
		}
		setPending(null);
		router.push({ params: { mode: ready.pending }, pathname: "/update" });
	}, [gateLoading, navigationReady, pending, presented, revealed, router]);
}
