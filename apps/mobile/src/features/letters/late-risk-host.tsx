import * as Sentry from "@sentry/react-native";
import { usePathname } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
 *
 * It waits while Write is up (never stacking on Write's own care) and while a natively presented
 * screen is (`isPresented`: a host draws under those, so the care would be heard unseen). Still
 * covered once the open's window has passed, it waits for the next open. Kept above the stack
 * while signed in; it draws only while the care is up.
 */
export function LateRiskHost({
	isPresented,
}: {
	isPresented: (pathname: string) => boolean;
}) {
	const risk = useLettersLateRisk();
	const calls = useLettersCalls();
	const reduced = useEffectiveReducedMotion();
	const pathname = usePathname();
	const covered = pathname === WRITE_PATH || isPresented(pathname);
	// True from launch and each return to the front, for the open's window or until the care shows.
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

	const due = lateCareDue({ armed, covered, risk, showing });
	useEffect(() => {
		if (due === null) {
			return;
		}
		heard.current = false;
		setShowing(due);
		setArmed(false);
	}, [due]);

	// Read at the timer's end, so a new `calls` object on a re-render doesn't restart the wait.
	const reportShown = useEffectEvent((shown: LateRisk) => {
		heard.current = true;
		calls
			.lateRiskShown(shown)
			.catch((error: unknown) => Sentry.captureException(error));
	});

	// Heard only once the care has risen on screen, at the level it showed. Closed sooner, it isn't
	// heard, and shows again at the next open.
	useEffect(() => {
		if (showing === null || heard.current) {
			return;
		}
		const t = setTimeout(
			() => reportShown(showing),
			reduced ? LETTER_MOTION.reducedMs : LETTER_MOTION.risk.sheetMs
		);
		return () => clearTimeout(t);
	}, [showing, reduced]);

	// The open's window: a risk that arrives later, or one still covered by then, waits for the
	// next open rather than rising over what someone is doing.
	useEffect(() => {
		if (!armed) {
			return;
		}
		const t = setTimeout(() => setArmed(false), ARMED_MS);
		return () => clearTimeout(t);
	}, [armed]);

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
