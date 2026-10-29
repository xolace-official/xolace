import { ConvexError } from "convex/values";
import { toast } from "sonner";

/**
 * Convex rejects what the UI's gates missed (a stale view, a rule the UI doesn't
 * check), so every store action can fail. Editors run them through this: a toast
 * either way, and `true` only when the write landed, so a draft is kept on failure.
 */
export async function runAction(
	action: () => Promise<unknown>,
	success: string
): Promise<boolean> {
	try {
		await action();
		toast.success(success);
		return true;
	} catch (error) {
		toast.error(errorMessage(error));
		return false;
	}
}

/** The text a Convex function threw: `ConvexError("…")` or `ConvexError({ message })`. */
export function errorMessage(error: unknown): string {
	if (error instanceof ConvexError) {
		const data: unknown = error.data;
		if (typeof data === "string") {
			return data;
		}
		if (
			typeof data === "object" &&
			data !== null &&
			"message" in data &&
			typeof data.message === "string"
		) {
			return data.message;
		}
	}
	return error instanceof Error ? error.message : "Something went wrong";
}
