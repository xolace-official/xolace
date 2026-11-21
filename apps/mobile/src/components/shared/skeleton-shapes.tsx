import { useWindowDimensions, View } from "react-native";
import { Bone, Line, Pill, SKELETON, SkeletonBreath } from "./skeleton";

export const TITLE_W = ["62%", "48%", "70%", "55%", "66%", "44%"] as const;
export const META_W = ["38%", "52%", "30%", "44%", "36%", "48%"] as const;
const LOADING = "Loading";

export const widthAt = <T,>(widths: readonly T[], i: number): T =>
	widths[i % widths.length] as T;

type Lead = "avatar" | "art" | "none";

function RowLead({ lead }: { lead: Lead }) {
	if (lead === "avatar") {
		return <Bone h={48} r={24} w={48} />;
	}
	if (lead === "art") {
		return <Bone h={52} r={14} w={52} />;
	}
	return null;
}

export function SkeletonRows({
	rows = 4,
	lead = "avatar",
	hairline = true,
}: {
	rows?: number;
	lead?: Lead;
	hairline?: boolean;
}) {
	return (
		<>
			{Array.from({ length: rows }, (_, i) => (
				<View key={i}>
					<View className="min-h-18 flex-row items-center gap-3 px-4 py-3">
						<RowLead lead={lead} />
						<View className="flex-1 gap-0.5">
							<Line lh={21} w={widthAt(TITLE_W, i)} />
							<Line h={SKELETON.meta} lh={18} w={widthAt(META_W, i)} />
						</View>
					</View>
					{hairline && i < rows - 1 ? (
						<View className="ml-19 h-px bg-separator" />
					) : null}
				</View>
			))}
		</>
	);
}

export function DiscoverySkeleton({
	cards = 3,
	label = LOADING,
}: {
	cards?: number;
	label?: string;
}) {
	return (
		<SkeletonBreath className="gap-2.5" label={label}>
			{Array.from({ length: cards }, (_, i) => (
				<View
					className="gap-2.5 rounded-[26px] border-continuous bg-surface p-4"
					key={i}
				>
					<View className="flex-row items-center gap-3">
						<Bone h={56} r={28} w={56} />
						<View className="flex-1 gap-0.5">
							<Line lh={22} w={i % 2 ? 96 : 76} />
							<Line h={SKELETON.meta} lh={18} w={110} />
						</View>
						<Bone w={40} />
					</View>
					<View>
						<Line lh={22} w="94%" />
						<Line lh={22} w={widthAt(TITLE_W, i + 2)} />
					</View>
					<View className="flex-row gap-1.5">
						<Pill w={70} />
						<Pill w={56} />
						{i % 2 ? null : <Pill w={64} />}
					</View>
				</View>
			))}
		</SkeletonBreath>
	);
}

export function ProfileSkeleton({ label = LOADING }: { label?: string }) {
	return (
		<SkeletonBreath fill label={label}>
			<View className="items-center gap-2.5 px-7 pt-2">
				<View className="rounded-full border-4 border-surface">
					<Bone h={116} r={58} w={116} />
				</View>
				<Line center h={SKELETON.title} lh={36} w={120} />
				<Line center h={SKELETON.meta} lh={18} w={190} />
				<View className="w-full items-center">
					<Line center lh={25} w="88%" />
					<Line center lh={25} w="62%" />
				</View>
				<View className="flex-row gap-1.5">
					<Pill w={70} />
					<Pill w={56} />
					<Pill w={64} />
				</View>
			</View>
			<View className="flex-1" />
			<View className="mx-4 gap-3 rounded-[22px] border-continuous bg-surface p-4">
				{[0, 1].map((i) => (
					<View className="flex-row gap-3" key={i}>
						<Line lh={20} w={78} />
						<View className="flex-1">
							<Line lh={21} w="92%" />
							<Line lh={21} w="58%" />
						</View>
					</View>
				))}
			</View>
		</SkeletonBreath>
	);
}

const COVER_SHARE = 0.52;
const SHEET_OVERLAP = 28;
const PARA = ["100%", "96%", "100%", "88%", "100%", "93%", "61%"] as const;

export function ReaderSkeleton({ label = LOADING }: { label?: string }) {
	const { height } = useWindowDimensions();
	const coverH = Math.round(height * COVER_SHARE);
	return (
		<SkeletonBreath fill label={label}>
			<View
				className="justify-end bg-surface-secondary px-6"
				style={{ height: coverH, paddingBottom: SHEET_OVERLAP + 20 }}
			>
				<Line className="bg-surface" h={24} lh={37} w="78%" />
				<Line className="bg-surface" h={24} lh={37} w="48%" />
				<View className="mt-2">
					<Line className="bg-surface" h={SKELETON.meta} lh={18} w={150} />
				</View>
			</View>
			<View
				className="flex-1 rounded-t-[28px] border-continuous bg-background px-6 pt-7"
				style={{ marginTop: -SHEET_OVERLAP }}
			>
				{[0, 1].map((p) => (
					<View className="mb-4" key={p}>
						{PARA.slice(p * 2).map((w, i) => (
							<Line h={14} key={`${p}-${w}-${i}`} lh={31} w={w} />
						))}
					</View>
				))}
			</View>
		</SkeletonBreath>
	);
}
