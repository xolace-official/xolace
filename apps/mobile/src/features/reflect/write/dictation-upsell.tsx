import { SettingsDialog } from "@/components/settings-kit/settings-dialog";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { COPY } from "../copy";
import { useReflect } from "../reflect-data";

const UPSELL = COPY.dictation.upsell;

/** A free person's one introduction to Plus dictation, on their first mic tap (#559). */
export function DictationUpsell() {
	const { state, actions } = useReflect();
	return (
		<SettingsDialog
			cancel={UPSELL.notNow}
			desc={UPSELL.body}
			ok={UPSELL.upgrade}
			onCancel={() => {
				playSoftPress();
				actions.dismissUpsell();
			}}
			onOk={() => {
				playAffirmativePress();
				actions.upgradeDictation();
			}}
			open={state.upsellOpen}
			title={UPSELL.title}
		>
			{null}
		</SettingsDialog>
	);
}
