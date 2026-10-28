import { useEffect, useRef } from "react";
import { posthog } from "@/config/posthog";
import {
	REFLECT_TOUR_VERSION,
	shouldShowReflectTour,
} from "@/features/reflect-tour/tour-copy";
import { useAppStore } from "@/store/store";

/**
 * When the first-install walkthrough runs, and what to record about it.
 *
 * Stepping belongs to `<Tour>` — this only decides whether it is open, and
 * stamps the current tour version once it closes either way.
 */
export function useReflectTour() {
	const reflectTourVersion = useAppStore((s) => s.reflectTourVersion);
	const setReflectTourVersion = useAppStore((s) => s.setReflectTourVersion);
	const homeSheetBlocking = useAppStore((s) => s.homeSheetBlocking);

	// Lives in the store so the streak reveal can wait on the tour actually
	// being on screen rather than on the persisted version flag.
	const isActive = useAppStore((s) => s.reflectTourActive);
	const setIsActive = useAppStore((s) => s.setReflectTourActive);
	// Only read when the tour is abandoned, so a ref rather than state: the
	// number the event wants is the last step shown, not a render input.
	const lastStep = useRef(0);

	// Start after the idle screen settles, once no other home sheet is covering
	// the screen — without the homeSheetBlocking gate the spotlight would render
	// under the return-welcome or awareness sheet.
	useEffect(() => {
		if (!shouldShowReflectTour(reflectTourVersion) || homeSheetBlocking) {
			return;
		}

		const timer = setTimeout(() => {
			setIsActive(true);
			posthog.capture("tour_started");
		}, 800);

		return () => clearTimeout(timer);
	}, [reflectTourVersion, homeSheetBlocking, setIsActive]);

	const finish = () => {
		setIsActive(false);
		setReflectTourVersion(REFLECT_TOUR_VERSION);
		posthog.capture("tour_completed");
	};

	const skip = () => {
		setIsActive(false);
		setReflectTourVersion(REFLECT_TOUR_VERSION);
		posthog.capture("tour_skipped", { at_step: lastStep.current });
	};

	const trackStep = (order: number) => {
		lastStep.current = order;
	};

	return { finish, isActive, skip, trackStep };
}
