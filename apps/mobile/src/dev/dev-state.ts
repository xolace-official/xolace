import type { NativeStackNavigationOptions } from "expo-router";
import type { ComponentType } from "react";

export type DevState = {
	readonly id: string;
	readonly title: string;
	readonly Screen: ComponentType;
	readonly options?: Omit<NativeStackNavigationOptions, "presentation">;
};
