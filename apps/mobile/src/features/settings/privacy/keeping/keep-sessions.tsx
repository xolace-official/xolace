import { View } from "react-native";
import { Rows, SettingsCard } from "@/components/settings-kit/parts";
import { LABEL, ROW_TALL } from "@/components/settings-kit/settings-layout";
import { TintPress } from "@/components/settings-kit/tint-press";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Icon } from "@/components/shared/icon";
import {
	PRIVACY_COPY as C,
	PRIVACY_ICONS as I,
	RETENTION,
} from "@/features/settings/privacy/copy";
import { usePrivacyScreen } from "@/features/settings/privacy/privacy-data";
import {
	retentionAlert,
	shownRetention,
} from "@/features/settings/privacy/privacy-model";
import { useTokenColors } from "@/lib/use-token-color";

const CHECK_GLYPH = 15;

/**
 * "Keep my sessions" (board `.rad`): a checked list, the accent check only on the chosen row.
 * A shorter period that would delete sessions asks first; Cancel keeps the previous choice.
 */
export function KeepSessions() {
	const { state, actions } = usePrivacyScreen();
	const [accent] = useTokenColors(["accent"]);
	// No check until the saved choice is known.
	const chosen = state.loading
		? null
		: shownRetention(state.retention, state.pending);
	const alert =
		state.pending && state.past
			? retentionAlert(state.pending, state.past)
			: null;
	return (
		<>
			<SettingsCard>
				<View accessibilityLabel={C.keep} accessibilityRole="radiogroup">
					<Rows>
						{RETENTION.map((r) => {
							const on = chosen === r.id;
							return (
								<TintPress
									accessibilityLabel={`${r.label}, ${r.sub}`}
									accessibilityRole="radio"
									accessibilityState={{ checked: on }}
									className={ROW_TALL}
									key={r.id}
									onPress={() => actions.pickRetention(r.id)}
								>
									<View className="flex-1 gap-px">
										<AppText className={LABEL} variant="body">
											{r.label}
										</AppText>
										<AppText
											className="text-[13px] text-foreground/52 leading-[18px]"
											variant="body"
										>
											{r.sub}
										</AppText>
									</View>
									<View className={on ? "opacity-100" : "opacity-0"}>
										<Icon
											color={accent}
											name={I.check}
											size={CHECK_GLYPH}
											weight="semibold"
										/>
									</View>
								</TintPress>
							);
						})}
					</Rows>
				</View>
			</SettingsCard>
			<ConfirmationDialog
				confirmLabel={C.alert.ok}
				description={alert?.body ?? ""}
				isDestructive
				isLoading={state.applying}
				isOpen={alert !== null}
				onConfirm={actions.confirmRetention}
				onOpenChange={(open) => {
					if (!(open || state.applying)) {
						actions.cancelRetention();
					}
				}}
				title={alert?.title ?? ""}
			/>
		</>
	);
}
