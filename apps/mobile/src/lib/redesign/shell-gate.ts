/**
 * The `redesign-v2` gate (redesign phasing §4.1): which shell a launch gets, the
 * old one (Discovery · Browse · Connect) or the redesign's (Today · Explore ·
 * Connect · You). Pure, so the rules are tested; the app's instance is
 * `shell.ts`.
 */

/** The PostHog flag. Off until the redesign's screens and letters are in. */
export const REDESIGN_V2_FLAG = "redesign-v2";

export type Shell = "v1" | "v2";

type FlagValue = string | boolean | undefined;

/** Where a launch's shell comes from. */
export type ShellSources = {
	/** Dev builds honour the overrides; release builds read only the flag. */
	readonly dev: boolean;
	/** The shell picked in Account › Dev tools, kept on the device. */
	readonly stored: () => Shell | null;
	/** `EXPO_PUBLIC_REDESIGN_V2`, inlined when the bundle is built. */
	readonly env: string | undefined;
	/** PostHog's value, which is off in dev builds (`config/posthog.ts`). */
	readonly flag: () => FlagValue;
};

const ENV_SHELLS: Readonly<Record<string, Shell>> = {
	"0": "v1",
	"1": "v2",
	false: "v1",
	off: "v1",
	on: "v2",
	true: "v2",
	v1: "v1",
	v2: "v2",
};

/** `EXPO_PUBLIC_REDESIGN_V2`: `on`/`off` (or `1`/`0`, `true`/`false`, `v2`/`v1`). Anything
 * else, unset included, forces nothing. */
export const shellFromEnv = (value: string | undefined): Shell | null =>
	(value && ENV_SHELLS[value.trim().toLowerCase()]) || null;

/**
 * A dev build takes the Dev tools row's shell, then the env var's, then the
 * flag. A release build takes the flag alone. Only a flag that is `true` turns
 * the redesign on: unloaded, missing or any other value is the old shell.
 */
export function resolveShell(sources: ShellSources): Shell {
	if (sources.dev) {
		const forced = sources.stored() ?? shellFromEnv(sources.env);
		if (forced) {
			return forced;
		}
	}
	return sources.flag() === true ? "v2" : "v1";
}

/**
 * Reads the shell the first time it is asked for and keeps it, in memory, until
 * the app restarts: switching shells under a running app would tear down every
 * tab. A flag that changes, or loads late, applies from the next launch.
 */
export function createShellGate(sources: ShellSources): () => Shell {
	let frozen: Shell | undefined;
	return () => {
		frozen ??= resolveShell(sources);
		return frozen;
	};
}
