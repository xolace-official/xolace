import { View } from "react-native";
import { Label, Rows, SettingsCard } from "@/components/settings-kit/parts";
import { ROW_TALL } from "@/components/settings-kit/settings-layout";
import { TintPress } from "@/components/settings-kit/tint-press";
import { Icon } from "@/components/shared/icon";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import {
	APPEARANCE_COPY as C,
	APPEARANCE_ICONS as I,
} from "@/features/settings/appearance/copy";
import { useTokenColor } from "@/lib/use-token-color";

export function MotionCard() {
	const { state, actions } = useAppearanceScreen();
	const accent = useTokenColor("accent");
	return (
		<SettingsCard>
			<View accessibilityRole="radiogroup">
				<Rows>
					{C.motions.map((m) => {
						const on = state.motion === m.id;
						return (
							<TintPress
								accessibilityLabel={m.label}
								accessibilityRole="radio"
								accessibilityState={{ checked: on }}
								className={ROW_TALL}
								key={m.id}
								onPress={() => {
									if (!on) {
										actions.setMotion(m.id);
									}
								}}
							>
								<Label>{m.label}</Label>
								{on ? (
									<Icon
										color={accent}
										name={I.check}
										size={15}
										weight="semibold"
									/>
								) : null}
							</TintPress>
						);
					})}
				</Rows>
			</View>
		</SettingsCard>
	);
}
