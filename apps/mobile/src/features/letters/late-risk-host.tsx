import * as Sentry from "@sentry/react-native";
import { usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTER_MOTION } from "./letter-motion";
import { type LateRisk, lateCareDue } from "./letters-contract";
import { useLettersCalls, useLettersLateRisk } from "./use-letters-data";
import { WriteCare } from "./write/write-care";

/** How long after opening a risk may still arrive and show (the reconnect's status). */
const ARMED_MS = 10_000;
/** Write draws its own care for a risk at Send: this one never stacks on it. */
const WRITE_PATH = "/letters/write";

/**
 * A letter that read as sent, which a background re-check later found was written at risk (spec
 * §5.4, owner F5): the next time the app opens or comes back to the front, the sender gets the
 * care a `risk` answer shows at Send. Once it has risen the server hears which level was shown
 * (`lateRiskShown`), so it doesn't come back; a crisis raised meanwhile still does, next open.
 * It waits while Write is up, so it never stacks on Write's own care. Kept above the stack while
 * signed in; it draws only while the care is up.
 */
export function LateRiskHost() {
	const risk = useLettersLateRisk();
	const calls = useLettersCalls();
	const reduced = useEffectiveReducedMotion();
	const onWrite = usePathname() === WRITE_PATH;
	// True from launch and each return to the front, until the care has shown once.
	const [armed, setArmed] = useState(true);
	const [showing, setShowing] = useState<LateRisk | null>(null);
	// Heard for this showing already (a re-render mustn't call it twice).
	const heard = useRef(false);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				setArmed(true);
			}
		});
		return () => sub.remove();
	}, []);

	const due = lateCareDue(risk, armed && !onWrite, showing);
	useEffect(() => {
		if (due === null) {
			return;
		}
		heard.current = false;
		setShowing(due);
		setArmed(false);
	}, [due]);

	// Heard only once the care has risen on screen, at the level it showed. Closed sooner, it isn't
	// heard, and shows again at the next open.
	useEffect(() => {
		if (showing === null || heard.current) {
			return;
		}
		const t = setTimeout(
			() => {
				heard.current = true;
				calls
					.lateRiskShown(showing)
					.catch((error: unknown) => Sentry.captureException(error));
			},
			reduced ? LETTER_MOTION.reducedMs : LETTER_MOTION.risk.sheetMs
		);
		return () => clearTimeout(t);
	}, [showing, reduced, calls]);

	// Nothing to show as the app opened (after a reconnect's fresh status has had time to land):
	// a risk found later waits for the next open, rather than rising over what someone is doing.
	useEffect(() => {
		if (risk !== null || !armed) {
			return;
		}
		const t = setTimeout(() => setArmed(false), ARMED_MS);
		return () => clearTimeout(t);
	}, [risk, armed]);

	const close = () => setShowing(null);
	return (
		<WriteCare
			onClose={close}
			onLeave={close}
			open={showing !== null}
			reduced={reduced}
		/>
	);
}
