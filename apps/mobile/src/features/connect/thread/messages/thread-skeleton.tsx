import { Bone, SkeletonBreath } from "@/components/shared/skeleton";
import { THREAD } from "../copy";

export function ThreadSkeleton() {
	return (
		<SkeletonBreath
			className="flex-1 justify-end gap-2 bg-background px-3.5 pb-10"
			fill
			label={THREAD.loading}
		>
			<Bone className="self-end" h={48} r={22} w="66%" />
			<Bone h={64} r={22} w="60%" />
			<Bone className="self-end" h={48} r={22} w="50%" />
		</SkeletonBreath>
	);
}
