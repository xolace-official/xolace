import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { BlurView } from "@/components/shared/styled";
import { COPY } from "@/features/lantern/copy";
import type { ReadMark as Mark } from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { useTokenColor } from "@/lib/use-token-color";

const M = LS.mark;
const CHECK = { android: "check", ios: "checkmark" } as const;
const CHIP_BLUR = 12;

export function ReadMark({ mark }: { mark: Mark | null }) {
	if (!mark) {
		return null;
	}
	return mark.kind === "read" ? (
		<ReadChip />
	) : (
		<PartwayLine share={mark.share} />
	);
}

function PartwayLine({ share }: { share: number }) {
	return (
		<View
			className="absolute h-[3px] overflow-hidden rounded-[2px] bg-cover-ink/35"
			style={{ bottom: M.bottom, left: M.inset, right: M.inset }}
		>
			<View
				className="h-full rounded-[2px] bg-cover-ink"
				style={{ width: `${share * 100}%` }}
			/>
		</View>
	);
}

function ReadChip() {
	const ink = useTokenColor("cover-ink");
	return (
		<View
			className="absolute flex-row items-center gap-[3px] overflow-hidden pr-[7px] pl-[5px]"
			style={{
				borderRadius: M.chipH / 2,
				bottom: M.chipAt,
				height: M.chipH,
				left: M.chipAt,
			}}
		>
			<BlurView
				className="absolute inset-0"
				intensity={CHIP_BLUR}
				tint="dark"
			/>
			<View className="absolute inset-0 bg-lantern-chip" />
			<Icon color={ink} name={CHECK} size={12} weight="bold" />
			<AppText
				className="text-[11px] text-cover-ink leading-[13px]"
				variant="caption"
				weight="semibold"
			>
				{COPY.row.read}
			</AppText>
		</View>
	);
}
