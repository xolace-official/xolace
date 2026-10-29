/**
 * Give a staff member admin access, creating their Clerk account if needed.
 *
 *   bun run grant-admin <work-email> [--name "First Last"]
 *   bun run grant-admin <work-email> --revoke
 *
 * Runs against the Clerk instance whose CLERK_SECRET_KEY varlock loads for this
 * app (dev keys locally). Admin = `publicMetadata.role === "admin"`, which the
 * session token copies into the `role` claim Convex checks. No Convex user row is
 * needed: admin functions identify staff by their token alone.
 *
 * A new account gets a password typed here (not echoed, never logged). An existing
 * account keeps its sign-in methods; only the role changes. Takes effect when the
 * person's session token next refreshes (about a minute), or on their next sign-in.
 */
import { createInterface } from "node:readline/promises";

const CLERK_API = "https://api.clerk.com/v1";
const ADMIN_ROLE = "admin";
const CTRL_C = "\u0003";
const BACKSPACE = new Set(["\u007f", "\b"]);
const ENTER = new Set(["\r", "\n"]);
const WHITESPACE = /\s+/;

interface ClerkUser {
	id: string;
	public_metadata: Record<string, unknown>;
}

function log(message: string) {
	process.stdout.write(`${message}\n`);
}

function parseArgs(argv: string[]) {
	const [email, ...rest] = argv;
	if (!email?.includes("@")) {
		throw new Error(
			'Usage: bun run grant-admin <work-email> [--name "First Last"] [--revoke]'
		);
	}
	const nameAt = rest.indexOf("--name");
	const name = nameAt === -1 ? undefined : rest[nameAt + 1];
	return {
		email: email.trim().toLowerCase(),
		name,
		revoke: rest.includes("--revoke"),
	};
}

async function clerk<T>(path: string, init?: RequestInit): Promise<T> {
	const secret = process.env.CLERK_SECRET_KEY;
	if (!secret) {
		throw new Error("CLERK_SECRET_KEY is not set (apps/admin/.env.local).");
	}
	const response = await fetch(`${CLERK_API}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${secret}`,
			"Content-Type": "application/json",
		},
	});
	if (!response.ok) {
		throw new Error(
			`Clerk ${init?.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`
		);
	}
	return (await response.json()) as T;
}

/** Read a line without echoing it. Needs a real terminal. */
function promptHidden(question: string): Promise<string> {
	const { stdin, stdout } = process;
	if (!stdin.isTTY) {
		throw new Error(
			"Run this in a terminal: it asks for the password without echoing it."
		);
	}
	stdout.write(question);
	stdin.setRawMode(true);
	stdin.setEncoding("utf8");
	stdin.resume();

	return new Promise((resolve, reject) => {
		let value = "";
		function stop() {
			stdin.off("data", onData);
			stdin.setRawMode(false);
			stdin.pause();
			stdout.write("\n");
		}
		function onData(chunk: string) {
			for (const char of chunk) {
				if (ENTER.has(char)) {
					stop();
					resolve(value);
					return;
				}
				if (char === CTRL_C) {
					stop();
					reject(new Error("Cancelled."));
					return;
				}
				value = BACKSPACE.has(char) ? value.slice(0, -1) : value + char;
			}
		}
		stdin.on("data", onData);
	});
}

async function confirmLive() {
	if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
		return;
	}
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(
		"This is the PRODUCTION Clerk instance. Type 'production' to go on: "
	);
	rl.close();
	if (answer.trim() !== "production") {
		throw new Error("Cancelled.");
	}
}

async function main() {
	const { email, name, revoke } = parseArgs(process.argv.slice(2));
	await confirmLive();

	const [existing] = await clerk<ClerkUser[]>(
		`/users?email_address=${encodeURIComponent(email)}`
	);

	if (existing) {
		// Metadata updates merge; null removes the key.
		await clerk(`/users/${existing.id}/metadata`, {
			body: JSON.stringify({
				public_metadata: { role: revoke ? null : ADMIN_ROLE },
			}),
			method: "PATCH",
		});
		log(
			`${revoke ? "Revoked admin from" : "Granted admin to"} ${email} (${existing.id}).`
		);
		return;
	}

	if (revoke) {
		log(`No Clerk account for ${email}; nothing to revoke.`);
		return;
	}

	const password = await promptHidden(`Password for ${email}: `);
	const again = await promptHidden("Again: ");
	if (password !== again) {
		throw new Error("The passwords don't match.");
	}
	const [firstName, ...lastNames] = name?.trim().split(WHITESPACE) ?? [];
	const created = await clerk<ClerkUser>("/users", {
		body: JSON.stringify({
			email_address: [email],
			first_name: firstName,
			last_name: lastNames.join(" ") || undefined,
			password,
			public_metadata: { role: ADMIN_ROLE },
		}),
		method: "POST",
	});
	log(`Created ${email} (${created.id}) as an admin. Sign in at /sign-in.`);
}

try {
	await main();
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exitCode = 1;
}
