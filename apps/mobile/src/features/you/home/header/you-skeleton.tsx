import { View } from "react-native";
import { Bone, Line, SkeletonBreath } from "@/components/shared/skeleton";
import { COPY } from "@/features/you/copy";
import { Surface } from "@/features/you/surface";

const AVATAR = 92;
const STREAK_H = 200;
const BADGES_H = 65;
const DAYS = 7;
const DISC = 30;
const STATS = 3;
const MEDALS = 3;
const MEDAL = 41;
const MEDAL_OVERLAP = 14;

/** The header's shape while its data loads: same paddings and card sizes as `YouHeader`, so
 * the real header lands where the bones were. */
export function YouSkeleton() {
	return (
		<SkeletonBreath
			className="items-center px-5 pt-safe-offset-[42px]"
			label={COPY.screen.loading}
		>
			<Bone h={AVATAR} r={AVATAR / 2} w={AVATAR} />
			<View className="mt-4 items-center">
				<Line center h={20} lh={32} w={210} />
			</View>
			<View className="mt-1.25 items-center">
				<Line center lh={20} w={150} />
			</View>

			<Surface
				className="mt-6 self-stretch px-4 pt-4 pb-3.5"
				radius={26}
				style={{ height: STREAK_H }}
			>
				<Line h={18} lh={34} w={120} />
				<View className="mt-3.5 h-[52px] flex-row items-center justify-between px-0.5">
					{Array.from({ length: DAYS }, (_, i) => (
						<Bone h={DISC} key={i} r={DISC / 2} w={DISC} />
					))}
				</View>
				<View className="mt-3 flex-row border-separator border-t-[0.5px] pt-3">
					{Array.from({ length: STATS }, (_, i) => (
						<View className="flex-1 items-center gap-0.5" key={i}>
							<Line center h={15} lh={23} w={28} />
							<Line center h={9} lh={14} w={48} />
						</View>
					))}
				</View>
			</Surface>

			<Surface
				className="mt-3 flex-row items-center gap-2.75 self-stretch px-3.5"
				radius={20}
				style={{ height: BADGES_H }}
			>
				<View className="flex-row">
					{Array.from({ length: MEDALS }, (_, i) => (
						<Bone
							h={MEDAL}
							key={i}
							r={MEDAL / 2}
							style={{ marginLeft: i === 0 ? 0 : -MEDAL_OVERLAP }}
							w={MEDAL}
						/>
					))}
				</View>
				<View className="flex-1 gap-px">
					<Line lh={19} w={90} />
					<Line h={10} lh={16} w={160} />
				</View>
			</Surface>

			<View className="mt-4.5 h-13 flex-row self-stretch border-separator border-b-[0.5px]">
				<View className="flex-1 items-center justify-center">
					<Bone w={64} />
				</View>
				<View className="flex-1 items-center justify-center">
					<Bone w={80} />
				</View>
			</View>
		</SkeletonBreath>
	);
}
