import { plusCard } from "@/features/settings/home/home-model";
import type { SettingsHome } from "@/features/settings/home/settings-home-data";

const ignore = () => undefined;

export const HOME_ACTIONS: SettingsHome["actions"] = {
	checkForUpdates: ignore,
	open: ignore,
	openPlus: ignore,
	openWhatsNew: ignore,
};

const TWELVE_MINUTES = 12 * 60;

export const HOME_PLUS: SettingsHome["state"] = {
	mode: "System",
	notifications: "On",
	plus: plusCard("plus", { secondsLeft: TWELVE_MINUTES }),
	signIn: "Apple",
	tone: "Gentle",
	update: { label: "Check for updates", value: "" },
	version: "Version 1.17.0 · Update Nov 8, 2026",
};

export const HOME_FREE: SettingsHome["state"] = {
	...HOME_PLUS,
	plus: plusCard("free", null),
};

export const HOME_UPDATED: SettingsHome["state"] = {
	...HOME_PLUS,
	update: { label: "Check for updates", value: "Up to date" },
};

export const HOME_LOADING: SettingsHome["state"] = {
	...HOME_PLUS,
	notifications: undefined,
	plus: plusCard("plus", undefined),
	signIn: undefined,
	tone: undefined,
};

export const HOME_PLUS_LOADING: SettingsHome["state"] = {
	...HOME_PLUS,
	plus: plusCard("loading", undefined),
};
