#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { ConvexReactClient } from "convex/react";
import { createSession } from "./auth/session";
import { createTokenStore } from "./auth/token-store";
import { login } from "./commands/login";
import { whoami } from "./commands/whoami";
import { readConfig } from "./config";
import { App, authHookFor } from "./tui/app";

const USAGE = `Usage: xolace [command]

  (none)            open Xolace in the terminal
  login [--device]  sign in (--device: enter a code on another device; default over SSH)
  logout            sign out on this machine
  whoami            show who you're signed in as
`;

const write = (text: string) => {
	process.stdout.write(text);
};

const runTui = async (
	config: ReturnType<typeof readConfig>,
	session: ReturnType<typeof createSession>
) => {
	// Fail before taking over the screen if there's no sign-in at all.
	await session.getIdToken();
	// ConvexProviderWithAuth calls setAuth itself; don't call it here too.
	const client = new ConvexReactClient(config.convexUrl);
	const renderer = await createCliRenderer();
	renderer.on("destroy", () => {
		client.close().catch(() => undefined);
	});
	createRoot(renderer).render(
		<App client={client} useAuth={authHookFor(session.fetchToken)} />
	);
};

const main = async ([command, ...flags]: string[]) => {
	if (command === "help" || command === "--help" || command === "-h") {
		write(USAGE);
		return;
	}
	const config = readConfig();
	const store = createTokenStore({ account: config.clerkIssuer });
	const session = createSession({ config, store });

	if (command === "login") {
		await login({
			config,
			store,
			write,
			...(flags.includes("--device") ? { device: true } : {}),
		});
	} else if (command === "logout") {
		await store.clear();
		write("Signed out on this machine.\n");
	} else if (command === "whoami") {
		await whoami({ config, session, write });
	} else if (command === undefined) {
		await runTui(config, session);
	} else {
		process.stderr.write(`Unknown command: ${command}\n\n${USAGE}`);
		process.exitCode = 1;
	}
};

try {
	await main(process.argv.slice(2));
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exitCode = 1;
}
