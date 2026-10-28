/** Zustand storage adapter: localStorage on web, expo-sqlite/kv-store on native. `getItem` is
 * synchronous so hydration lands on first render. */

import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

const isWeb = typeof window !== "undefined" && Platform.OS === "web";

export const zustandJSONStorage = {
	getItem: (name: string): string | null => {
		if (isWeb) {
			return window.localStorage.getItem(name);
		}
		return Storage.getItemSync(name);
	},
	removeItem: async (name: string) => {
		if (isWeb) {
			window.localStorage.removeItem(name);
		} else {
			await Storage.removeItem(name);
		}
	},
	setItem: async (name: string, value: string) => {
		if (isWeb) {
			window.localStorage.setItem(name, value);
		} else {
			await Storage.setItem(name, value);
		}
	},
};
