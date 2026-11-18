import { Label, SettingsCard } from "@/components/settings-kit/parts";
import {
	CHEVRON_GLYPH,
	ROW_TALL,
} from "@/components/settings-kit/settings-layout";
import { TintPress } from "@/components/settings-kit/tint-press";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { Icon } from "@/components/shared/icon";
import { useAppearanceScreen } from "@/features/settings/appearance/appearance-data";
import {
	APPEARANCE_COPY as C,
	APPEARANCE_ICONS as I,
} from "@/features/settings/appearance/copy";
import { useTokenColor } from "@/lib/use-token-color";

/** Replay intro ›, and the alert it asks first (held open by the screen's state). */
export function ReplayCard() {
	const { state, actions } = useAppearanceScreen();
	const subtle = useTokenColor("subtle");
	return (
		<>
			<SettingsCard>
				<TintPress
					accessibilityLabel={C.replay}
					className={ROW_TALL}
					onPress={() => actions.setReplayOpen(true)}
				>
					<Label>{C.replay}</Label>
					<Icon
						color={subtle}
						name={I.chevron}
						size={CHEVRON_GLYPH}
						weight="semibold"
					/>
				</TintPress>
			</SettingsCard>
			<ConfirmationDialog
				confirmLabel={C.replayAlert.ok}
				description={C.replayAlert.body}
				isOpen={state.replayOpen}
				onConfirm={actions.replayIntro}
				onOpenChange={actions.setReplayOpen}
				title={C.replayAlert.title}
			/>
		</>
	);
}
