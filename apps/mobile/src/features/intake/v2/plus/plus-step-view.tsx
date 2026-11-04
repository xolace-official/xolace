// The Xolace+ step as drawn (#713): header with Flux, the switch, the three moments and the
// footer. No store, no analytics: `PlusStep` wires those in, the dev preview its sample plans.
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/features/intake/v2/flux";
import type { PlusSide } from "@/features/intake/v2/machine";
import { MomentCards } from "@/features/intake/v2/plus/moment-cards";
import {
	PlusFooter,
	type PlusFooterProps,
} from "@/features/intake/v2/plus/plus-footer";
import { PlusSwitch } from "@/features/intake/v2/plus/plus-switch";

const FLUX_SIZE = 80;

export type PlusStepViewProps = Omit<PlusFooterProps, "onSeePlus"> & {
	onSide: (side: PlusSide) => void;
	/** "Try it" on the Talk card (#714); absent in the dev preview. */
	onTryTalk?: () => void;
};

export function PlusStepView({
	onSide,
	onTryTalk,
	...footer
}: PlusStepViewProps) {
	const { side } = footer;
	return (
		<View className="flex-1">
			<View className="flex-row items-center justify-between gap-3 px-5 pt-4">
				<View className="flex-1 gap-1.5">
					<View className="self-start rounded-full bg-ember/15 px-2.5 py-1">
						<AppText className="font-[Poppins-SemiBold] text-[12px] text-ember">
							Xolace+
						</AppText>
					</View>
					<AppText
						accessibilityRole="header"
						className="font-[Poppins-SemiBold] text-[24px] text-foreground leading-[28px]"
					>
						{"Same rough week.\nTwo ways it goes."}
					</AppText>
				</View>
				{/* Grey and resting on Free, in full colour and happy on Plus. */}
				<Flux
					mood={side === "plus" ? "happy" : "idle"}
					palette={side === "plus" ? undefined : "muted"}
					size={FLUX_SIZE}
				/>
			</View>

			<PlusSwitch onChange={onSide} side={side} />

			<ScrollView
				className="mt-3.5 flex-1"
				contentContainerClassName="px-5 pb-2"
				showsVerticalScrollIndicator={false}
			>
				<MomentCards onTryTalk={onTryTalk} side={side} />
			</ScrollView>

			<PlusFooter {...footer} onSeePlus={() => onSide("plus")} />
		</View>
	);
}
