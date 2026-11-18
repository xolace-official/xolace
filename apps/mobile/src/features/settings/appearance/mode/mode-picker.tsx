import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import {
	APPEARANCE_COPY as C,
	APPEARANCE_ICONS as I,
} from "@/features/settings/appearance/copy";
import { ModePane } from "@/features/settings/appearance/mode/mode-pane";
import { cn } from "@/lib/cn";
import { tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const RADIO = 22;

/** Mode as three pictures in one card (board `.modes`), a radio group. */
export function ModePicker() {
	const { state, actions } = useAppearanceScreen();
	const onAccent = useTokenColor("accent-foreground");
	return (
		<View
			accessibilityRole="radiogroup"
			className="mx-4 flex-row gap-2.5 rounded-[22px] border-continuous bg-surface px-3 pt-4 pb-3.5"
		>
			{C.modes.map((m) => {
				const on = state.mode === m.id;
				return (
					<Pressable
						accessibilityLabel={m.label}
						accessibilityRole="radio"
						accessibilityState={{ checked: on }}
						className="flex-1 items-center gap-2"
						key={m.id}
						onPress={() => {
							if (on) {
								return;
							}
							tap();
							actions.setMode(m.id);
						}}
					>
						<ModePane mode={m.id} on={on} />
						<AppText
							className="text-[14px] leading-[18px]"
							variant="body"
							weight="medium"
						>
							{m.label}
						</AppText>
						<View
							className={cn(
								"items-center justify-center rounded-full",
								on ? "bg-accent" : "border-[1.6px] border-foreground/28"
							)}
							style={{ height: RADIO, width: RADIO }}
						>
							{on ? (
								<Icon color={onAccent} name={I.check} size={11} weight="bold" />
							) : null}
						</View>
					</Pressable>
				);
			})}
		</View>
	);
}
