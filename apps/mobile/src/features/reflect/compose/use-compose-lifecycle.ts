import { useEffect, useRef } from "react";
import { useNavigation } from "expo-router";
import { playHomeEntrance } from "@/src/lib/haptics";

/**
 * The screen's two mount-and-leave concerns.
 *
 * Flux's entrance is a spring started on his own mount, so firing the haptic
 * here lands them in the same frame. The outgoing copy of a cross-fade is a
 * fresh mount in the exiting subtree, so it must not re-fire the entrance for
 * a screen the user is leaving.
 */
export const useComposeLifecycle = (
  focusOnExpand: boolean,
  tourActive: boolean,
  skipTour: () => void,
) => {
  const navigation = useNavigation();

  // Dismiss the tour if the user navigates away (e.g. the header's Help button)
  useEffect(() => {
    const unsub = navigation.addListener("blur", () => {
      if (tourActive) skipTour();
    });
    return unsub;
  }, [navigation, tourActive, skipTour]);

  const entranceFired = useRef(false);
  useEffect(() => {
    if (entranceFired.current || !focusOnExpand) return;
    entranceFired.current = true;
    playHomeEntrance();
  }, [focusOnExpand]);
};
