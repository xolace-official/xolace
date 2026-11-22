import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import type { FaceHandle } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { ReadAloud } from "./read-aloud";

const M = LAYOUT.mirror;
const LABEL = { fontSize: 11.5, letterSpacing: 1.38 } as const;
const VERSIONS = [1, 2] as const;

export function MirrorLabel({ face }: { face: FaceHandle }) {
	const { state, actions } = useReflect();
	const { late } = useReflectDraw();
	const ink = useTokenColor("eink");
	const { mirror, mv, landN, companionName } = state;

	return (
		<View>
			<View
				className="flex-row items-center gap-2"
				style={{ height: M.labelRow }}
			>
				<XolaceFace
					face={face}
					palette={late ? "ember" : undefined}
					size={M.face}
				/>
				<AppText
					accessibilityRole="header"
					maxFontSizeMultiplier={1.4}
					style={[LABEL, { color: ink }]}
					variant="caption"
					weight="bold"
				>
					{COPY.mirror.label}
				</AppText>
				{mirror.revised ? (
					<View className="ml-2 flex-row gap-1">
						{VERSIONS.map((v) => (
							<PressScale
								accessibilityRole="button"
								accessibilityState={{ selected: mv === v }}
								className={cn(
									"h-[22px] min-w-[22px] justify-center rounded-full px-[7px]",
									mv === v ? "bg-ember-wash" : "bg-surface-secondary"
								)}
								haptic={Presets.System.selection}
								key={v}
								onPress={() => actions.setVersion(v)}
							>
								<AppText
									className="text-[11.5px]"
									color={mv === v ? "emberInk" : "muted"}
									variant="caption"
									weight="semibold"
								>
									{v === 1 ? COPY.mirror.first : COPY.mirror.revised}
								</AppText>
							</PressScale>
						))}
					</View>
				) : null}
				<ReadAloud landN={landN} />
			</View>
			{companionName ? (
				<AppText color="muted" variant="caption">
					{COPY.mirror.fromTalk(companionName)}
				</AppText>
			) : null}
		</View>
	);
}
