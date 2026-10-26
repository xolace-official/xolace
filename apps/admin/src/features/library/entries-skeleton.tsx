import { Skeleton } from "@xolace/ui/components/skeleton";

const ROWS = 8;

export function EntriesSkeleton() {
	return (
		<div aria-busy className="flex flex-col gap-6">
			<Skeleton className="h-12 w-56" />
			<Skeleton className="h-9 w-96 max-w-full" />
			<Skeleton className="h-12 w-full max-w-xl" />
			<div className="flex flex-col gap-2">
				{Array.from({ length: ROWS }, (_, row) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
					<Skeleton className="h-14 w-full" key={row} />
				))}
			</div>
		</div>
	);
}
