import { SkeletonBreath } from "@/components/shared/skeleton";
import { SkeletonRows } from "@/components/shared/skeleton-shapes";

const SKELETON_ROWS = 3;

export function ListSkeleton({ label }: { label: string }) {
	return (
		<SkeletonBreath className="px-1" label={label}>
			<SkeletonRows lead="avatar" rows={SKELETON_ROWS} />
		</SkeletonBreath>
	);
}
