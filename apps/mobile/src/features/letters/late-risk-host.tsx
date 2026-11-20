import * as Sentry from "@sentry/react-native";
import { usePathname } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppState } from "react-native";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { LETTER_MOTION } from "./letter-motion";
import { type LateRisk, lateCareDue } from "./letters-contract";
import { useLettersCalls, useLettersLateRisk } from "./use-letters-data";
import { WriteCare } from "./write/write-care";

const ARMED_MS = 10_000;
const WRITE_PATH = "/letters/write";

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
	const [armed, setArmed] = useState(true);
	const [showing, setShowing] = useState<LateRisk | null>(null);
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
	if (due !== null) {
		setShowing(due);
		setArmed(false);
	}

	const reportShown = useEffectEvent((shown: LateRisk) => {
		heard.current = true;
		calls
			.lateRiskShown(shown)
			.catch((error: unknown) => Sentry.captureException(error));
	});

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

	useEffect(() => {
		if (!armed) {
			return;
		}
		const t = setTimeout(() => setArmed(false), ARMED_MS);
		return () => clearTimeout(t);
	}, [armed]);

	const close = () => {
		heard.current = false;
		setShowing(null);
	};
	return (
		<WriteCare
			onClose={close}
			onLeave={close}
			open={showing !== null}
			reduced={reduced}
		/>
	);
}
