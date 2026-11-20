import { fitSheet, type RootScreen } from "@/lib/root-screen";

export const feedbackScreens: readonly RootScreen[] = [
	// Shake to send feedback, or a concern about a person: a form sheet sized to its step.
	{ name: "feedback", options: fitSheet },
];
