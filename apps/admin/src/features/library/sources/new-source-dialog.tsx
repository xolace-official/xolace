"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { NewNamedDialog } from "@/features/content/new-named-dialog";

import { useLibrary } from "../library-provider";

/** Name the publisher; the credit line, licence and refresh window come next in the editor. */
export function NewSourceDialog() {
	const {
		actions,
		state: { sources },
	} = useLibrary();
	const router = useRouter();

	return (
		<NewNamedDialog
			description="The credit line, licence and refresh window come next, in the editor."
			nameLabel="Publisher"
			namePlaceholder="NHS"
			nameRequired="Name the publisher as credited."
			noun="source"
			onCreate={(name, slug) => {
				actions.createSource({
					attributionText: "",
					dropBrandingIfAdapted: true,
					licence: "",
					name,
					permission: "not_required",
					slug,
				});
				toast.success(`“${name}” added`);
				router.push(`/library/sources/${slug}`);
			}}
			slugHelp="Entry credits point at it, so it can't change after this."
			slugTaken={(slug) => sources.some((source) => source.slug === slug)}
		/>
	);
}
