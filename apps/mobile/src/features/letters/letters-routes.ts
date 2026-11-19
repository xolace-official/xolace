import { router } from "expo-router";

/** Where letters go. Pushed over whatever is up; the Letters screen is reached by `dismissTo`
 * when it may already be in the stack (from the writing screen). */
export const openLetter = (id: string) =>
	router.push({ params: { id }, pathname: "/letters/read/[id]" });

export const openWrite = () => router.push("/letters/write");

/** Back to the Letters screen under the writing screen, or to it fresh. */
export const backToLetters = () => router.dismissTo("/letters");

/**
 * Out of the reader (Hide, or a letter that isn't there): back where it was opened from, or to
 * the Letters screen when nothing is under it (a push opened it cold).
 */
export const leaveReader = () =>
	router.canGoBack() ? router.back() : router.replace("/letters");

export const openReport = (id: string) =>
	router.push({ params: { id }, pathname: "/letters/report" });
