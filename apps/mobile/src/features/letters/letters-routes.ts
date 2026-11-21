import { router } from "expo-router";
import { readerExit } from "./letters-model";

export const openLetter = (id: string) =>
	router.push({ params: { id }, pathname: "/letters/read/[id]" });

export const openWrite = () => router.push("/letters/write");

export const backToLetters = () => router.dismissTo("/letters");

export const leaveReader = (fromPush = false) =>
	readerExit(fromPush, router.canGoBack()) === "back"
		? router.back()
		: router.replace("/letters");

export const openLetters = () => router.push("/letters");

export const openReport = (id: string) =>
	router.push({ params: { id }, pathname: "/letters/report" });
