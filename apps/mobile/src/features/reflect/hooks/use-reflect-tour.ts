import { useEffect, useRef } from "react";
import { posthog } from "@/config/posthog";
import {
	REFLECT_TOUR_VERSION,
	shouldShowReflectTour,
} from "@/features/reflect-tour/tour-copy";
import { useAppStore } from "@/store/store";

/**
 * Whether the first-install walkthrough is open; stamps the tour version once it closes either way.
 */
export function useReflectTour() {
	const reflectTourVersion = useAppStore((s) => s.reflectTourVersion);
	const setReflectTourVersion = useAppStore((s) => s.setReflectTourVersion);
	const homeSheetBlocking = useAppStore((s) => s.homeSheetBlocking);

	// In the store so the streak reveal can wait on the tour being on screen.
	const isActive = useAppStore((s) => s.reflectTourActive);
	const setIsActive = useAppStore((s) => s.setReflectTourActive);
	// A ref: only read when the tour is abandoned, never a render input.
	const lastStep = useRef(0);

	// Starts after the idle screen settles; without the homeSheetBlocking gate the
	// spotlight would render under the return-welcome or awareness sheet.
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
