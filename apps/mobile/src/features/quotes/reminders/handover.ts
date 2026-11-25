/**
 * Moving an account from the old local quote reminders to the daily quote
 * push (B19). The old reminders lived on the phone, so someone who allowed
 * them with the main notifications switch off never had a device on the
 * server, and launch registers one only while that switch is on. Adopting
 * the setting alone would leave their push nowhere to land, and without the
 * zone its slot falls back to UTC.
 */

export type AdoptedQuote = { enabled: boolean } | null;

export type HandoverDeps = {
	/** Copies the old setting over; returns the daily quote setting it left. */
	adopt: () => Promise<AdoptedQuote>;
	handedOver: (accountId: string) => boolean;
	markHandedOver: (accountId: string) => void;
	/** Whether the OS already allows notifications. Never prompts. */
	permitted: () => Promise<boolean>;
	/** This device's push token, or null when it couldn't be fetched. */
	pushToken: () => Promise<string | null>;
	/** Registers the token for the daily quote alone (`autoEnable: false`). */
	register: (pushToken: string) => Promise<unknown>;
	saveTimezone: (timezone: string) => Promise<unknown>;
	timezone: () => string | null;
};

export type HandoverOutcome =
	| "already"
	| "off"
	| "no_permission"
	| "no_token"
	| "registered";

/**
 * Hand one account over, once. A token that couldn't be fetched (offline, no
 * project id) leaves it to try again next launch; a thrown call does too.
 */
export async function handOver(
	accountId: string,
	deps: HandoverDeps
): Promise<HandoverOutcome> {
	if (deps.handedOver(accountId)) {
		return "already";
	}
	const outcome = await registerForAdoptedQuote(await deps.adopt(), deps);
	if (outcome !== "no_token") {
		deps.markHandedOver(accountId);
	}
	return outcome;
}

async function registerForAdoptedQuote(
	adopted: AdoptedQuote,
	deps: HandoverDeps
): Promise<Exclude<HandoverOutcome, "already">> {
	if (!adopted?.enabled) {
		return "off";
	}
	if (!(await deps.permitted())) {
		return "no_permission";
	}
	const token = await deps.pushToken();
	if (!token) {
		return "no_token";
	}
	await deps.register(token);
	const zone = deps.timezone();
	if (zone) {
		await deps.saveTimezone(zone);
	}
	return "registered";
}

export type HandoverMemory = { handedOver: string[] };

/**
 * What the phone remembers, by account. Anything else reads as nobody handed
 * over, including the first builds' `{ adopted: true }`: those adopted without
 * registering, so each account goes through once more.
 */
export function readHandoverMemory(stored: unknown): HandoverMemory {
	if (
		typeof stored !== "object" ||
		stored === null ||
		!("handedOver" in stored) ||
		!Array.isArray(stored.handedOver)
	) {
		return { handedOver: [] };
	}
	return {
		handedOver: stored.handedOver.filter(
			(id: unknown): id is string => typeof id === "string"
		),
	};
}
