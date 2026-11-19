import { fitSheet, type RootScreen } from "@/lib/root-screen";

/** Letters (S20): pushed screens, and Report as a sheet sized to fit, like `/report-reflection`. */
export const lettersScreens: readonly RootScreen[] = [
	{ name: "letters/index" },
	{ name: "letters/write" },
	{ name: "letters/read/[id]" },
	{ name: "letters/report", options: fitSheet },
];
