import { router } from "expo-router";
import { readerExit } from "./letters-model";

/** Where letters go. Pushed over whatever is up; the Letters screen is reached by `dismissTo`
 * when it may already be in the stack (from the writing screen). */
export const openLetter = (id: string) =>
	router.push({ params: { id }, pathname: "/letters/read/[id]" });

export const openWrite = () => router.push("/letters/write");

/** Back to the Letters screen under the writing screen, or to it fresh. */
export const backToLetters = () => router.dismissTo("/letters");

/**
 * Out of the reader (Hide, or a letter that isn't there): back where it was opened from, or to
 * the Letters screen when nothing is under it. A letter gone after a push tap always lands on
 * Letters (`readerExit`).
 */
export const leaveReader = (fromPush = false) =>
	readerExit(fromPush, router.canGoBack()) === "back"
		? router.back()
		: router.replace("/letters");

/** The Letters screen, pushed over whatever is up (a session end's card whose letter is gone). */
export const openLetters = () => router.push("/letters");

export const openReport = (id: string) =>
	router.push({ params: { id }, pathname: "/letters/report" });
