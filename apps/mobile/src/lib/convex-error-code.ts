import { ConvexError } from "convex/values";

/** The `code` a Convex function threw with (`ConvexError({ code })`); production keeps `data`
 * when it scrubs the message. Undefined for any other error. */
export function convexErrorCode(error: unknown): string | undefined {
	if (!(error instanceof ConvexError)) {
		return;
	}
	const data: unknown = error.data;
	if (typeof data !== "object" || data === null || !("code" in data)) {
		return;
	}
	return typeof data.code === "string" ? data.code : undefined;
}
