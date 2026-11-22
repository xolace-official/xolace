import { router } from "expo-router";

export const LANDING = "/today" as const;

export function goHome() {
	router.dismissTo(LANDING);
	router.navigate(LANDING);
}
