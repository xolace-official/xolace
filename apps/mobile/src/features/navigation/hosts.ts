import type { ComponentType } from "react";
import type { Shell } from "@/lib/redesign/shell-gate";

/**
 * An overlay or listener the `(protected)` layout mounts above its stack in one
 * shell only: the arrivals host, a letters listener, the old badge unlock once
 * the arrivals replace it. A host both shells need stays in the layout itself.
 */
export type ShellHost = {
	/** Unique; the React key. */
	readonly name: string;
	readonly shell: Shell;
	readonly Host: ComponentType;
};

/**
 * Every shell-only host. A feature exports its own from its folder and adds
 * one entry here, so parallel PRs never edit the layout's lines.
 */
const SHELL_HOSTS: readonly ShellHost[] = [];

/** The hosts `shell` mounts, in order. */
export const hostsFor = (
	shell: Shell,
	hosts: readonly ShellHost[] = SHELL_HOSTS
): ShellHost[] => hosts.filter((host) => host.shell === shell);
