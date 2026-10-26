"use client";

import { useRouter } from "next/navigation";
import { NewNamedDialog } from "@/features/content/new-named-dialog";
import { runAction } from "@/features/content/run-action";

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
			onCreate={async (name, slug) => {
				const created = await runAction(
					() =>
						actions.createSource({
							attributionText: "",
							dropBrandingIfAdapted: true,
							licence: "",
							name,
							permission: "not_required",
							slug,
						}),
					`“${name}” added`
				);
				if (created) {
					router.push(`/library/sources/${slug}`);
				}
				return created;
			}}
			slugHelp="Entry credits point at it, so it can't change after this."
			slugTaken={(slug) => sources.some((source) => source.slug === slug)}
		/>
	);
}
