import type { ComponentType } from "react";

/**
 * An overlay or listener the `(protected)` layout mounts above its stack: the
 * arrivals host, a letters listener. One that predates the list (presence, the
 * now-playing audio, the badge unlock) stays in the layout until its screen PR
 * replaces it with an entry here.
 */
export type RootHost = {
	/** Unique; the React key. */
	readonly name: string;
	readonly Host: ComponentType;
};

/**
 * Every host a feature adds. A feature exports its own from its folder and adds
 * one entry here, so parallel PRs never edit the layout's lines.
 */
export const ROOT_HOSTS: readonly RootHost[] = [];
