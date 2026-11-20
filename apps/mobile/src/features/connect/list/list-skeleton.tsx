import { SkeletonBreath } from "@/components/shared/skeleton";
import { SkeletonRows } from "@/components/shared/skeleton-shapes";

const SKELETON_ROWS = 3;

/** Chats (and Archived) loading: the shared look's rows with an avatar lead. Row-shaped, not
 * card-shaped: the list it resolves into is flat, so the swap doesn't move the page. */
export function ListSkeleton({ label }: { label: string }) {
	return (
		<SkeletonBreath className="px-1" label={label}>
			<SkeletonRows lead="avatar" rows={SKELETON_ROWS} />
		</SkeletonBreath>
	);
}
