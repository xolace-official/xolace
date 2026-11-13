/**
 * Telegram Bot API transport (#765).
 *
 * Adapted from convex-telegram 0.1.2 (https://github.com/Re11oy/convex-telegram),
 * src/client/index.ts and src/client/utils.ts:
 *
 *   Copyright 2024 Convex, Inc.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 * Changes from the original: the proxy throws a typed `TelegramApiError`
 * carrying `error_code` and `retry_after`; the token comes only from
 * `TELEGRAM_BOT_TOKEN`; a constant-time comparison for the webhook secret.
 * The component's `webhooks` table, `registerRoutes` and `deleteWebhook`
 * aren't copied: the outreach domain owns its table and route.
 */
import type {
	APIMethodParams,
	APIMethods,
	TelegramAPIResponse,
} from "@gramio/types";

const TBA_BASE_URL = "https://api.telegram.org/bot";

/** The route Telegram posts updates to, under `CONVEX_SITE_URL`. */
export const TELEGRAM_WEBHOOK_PATH = "/telegram/webhook";

/** Telegram's header carrying the `secret_token` given to `setWebhook`. */
export const SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

/** A Bot API call Telegram refused. Never carries the token. */
export class TelegramApiError extends Error {
	readonly method: string;
	/** Telegram's `error_code` (an HTTP status: 400, 403, 429…). */
	readonly errorCode?: number;
	/** Seconds to wait, on a 429. */
	readonly retryAfter?: number;

	constructor(
		method: string,
		response: {
			description?: string;
			error_code?: number;
			retry_after?: number;
		}
	) {
		const code = response.error_code ? ` (${response.error_code})` : "";
		const detail = response.description ? `: ${response.description}` : "";
		super(`Telegram Bot API "${method}" failed${code}${detail}`);
		this.name = "TelegramApiError";
		this.method = method;
		this.errorCode = response.error_code;
		this.retryAfter = response.retry_after;
	}
}

/** The bot token, or undefined on a deployment with no bot. */
export function telegramToken(): string | undefined {
	const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
	return token ? token : undefined;
}

function requiredToken(): string {
	const token = telegramToken();
	if (!token) {
		throw new Error("TELEGRAM_BOT_TOKEN is not set on this deployment.");
	}
	return token;
}

/**
 * Typed Bot API client: `botApi.sendMessage({...})` posts to Telegram and
 * returns `result`, or throws `TelegramApiError`.
 *
 * @see https://core.telegram.org/bots/api#available-methods
 */
export const botApi: APIMethods = new Proxy({} as APIMethods, {
	get: (_target, method: string | symbol) => {
		// Not a thenable: `await botApi` must not call a method named "then".
		if (method === "then" || typeof method !== "string") {
			return;
		}
		const apiMethod = method as keyof APIMethods;
		return async (params?: APIMethodParams<typeof apiMethod>) => {
			const response = await fetch(
				`${TBA_BASE_URL}${requiredToken()}/${apiMethod}`,
				{
					body: params === undefined ? undefined : JSON.stringify(params),
					headers: { "Content-Type": "application/json" },
					method: "POST",
				}
			);
			const data = (await response.json()) as TelegramAPIResponse;
			if (!data.ok) {
				throw new TelegramApiError(apiMethod, {
					description: data.description,
					error_code: data.error_code,
					retry_after: data.parameters?.retry_after,
				});
			}
			return data.result;
		};
	},
});

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value)
	);
	return toHex(new Uint8Array(digest));
}

/**
 * 32 random bytes as hex: within `secret_token`'s allowed charset
 * (`A-Z a-z 0-9 _ -`, 1–256 chars).
 *
 * @see https://core.telegram.org/bots/api#setwebhook
 */
export function generateSecret(): string {
	const SECRET_BYTES = 32;
	return toHex(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)));
}

/** Compare two strings in time independent of where they differ. */
export function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}
