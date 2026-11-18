/**
 * Settings' one failed-write toast, for every page's data hook: an optimistic write that
 * failed has been rolled back by Convex, so say so. A `use-*` file because only data hooks
 * call the toast (`feature-shape.ts`).
 */
import { toast } from "@/components/shared/toast";

const SAVE_FAILED = {
	description: "Check your connection and try again.",
	title: "Couldn't save that",
} as const;

export const saveFailed = () => {
	toast(SAVE_FAILED.title, {
		description: SAVE_FAILED.description,
		variant: "danger",
	});
};

/** Sends a write and toasts if it fails. */
export const saved = (write: Promise<unknown>) => {
	write.catch(saveFailed);
};
