const SAFE_ERROR_KEYS = [
	"name",
	"message",
	"code",
	"status",
	"statusText",
] as const;

/** Apple's and Google's SDK codes for a sheet the person closed. */
const CANCEL_CODES: readonly (string | number)[] = [
	"ERR_REQUEST_CANCELED",
	"SIGN_IN_CANCELLED",
	-5,
];

export function errorCode(error: unknown): string | number | undefined {
	if (error && typeof error === "object" && "code" in error) {
		const { code } = error as { code: unknown };
		return typeof code === "string" || typeof code === "number"
			? code
			: undefined;
	}
}

export function isCancellation(error: unknown) {
	const code = errorCode(error);
	if (code !== undefined && CANCEL_CODES.includes(code)) {
		return true;
	}
	const message = error instanceof Error ? error.message.toLowerCase() : "";
	return message.includes("cancel") || message.includes("dismiss");
}

export function describeError(error: unknown) {
	if (error instanceof Error) {
		return `${error.name}: ${error.message}`;
	}
	if (typeof error === "object" && error !== null) {
		const record = error as Record<string, unknown>;
		const described = SAFE_ERROR_KEYS.filter(
			(k) => record[k] !== undefined
		).map((k) => `${k}: ${String(record[k])}`);
		return described.length > 0
			? described.join("\n")
			: `Unrecognized error object. Proto: ${Object.getPrototypeOf(error)?.constructor?.name ?? "none"}`;
	}
	return String(error);
}
