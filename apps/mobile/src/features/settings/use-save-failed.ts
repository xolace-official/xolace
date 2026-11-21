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

export const saved = (write: Promise<unknown>) => {
	write.catch(saveFailed);
};
