import { useState } from "react";
import { View } from "react-native";
import { NameDialog } from "@/components/settings-kit/name-dialog";
import {
	Footnote,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import {
	type NameDraft,
	useAccountScreen,
} from "@/features/settings/account/account-data";
import {
	canResetSpace,
	dialogCopy,
	NAME_MAX,
	spaceShown,
} from "@/features/settings/account/account-model";
import {
	ACCOUNT_COPY as C,
	ACCOUNT_ICONS as I,
} from "@/features/settings/account/copy";

const same = (a: NameDraft, b: NameDraft | null) =>
	b !== null && a.kind === b.kind && a.draft === b.draft && a.error === b.error;

export function NamesSection() {
	const { state, actions } = useAccountScreen();
	const { space, companion, dialog } = state;
	const [held, setHeld] = useState<NameDraft | null>(null);
	if (dialog && !same(dialog, held)) {
		setHeld(dialog);
	}
	const shown = dialog ?? held;
	const kind = shown?.kind ?? "name";
	const resettable =
		kind === "space" && space != null && canResetSpace(space, companion);
	return (
		<View className="mt-7">
			<SectionTitle>{C.names}</SectionTitle>
			<SettingsCard>
				<TileRow
					icon={I.name}
					label={C.yourName}
					onPress={() => actions.edit("name")}
					value={state.name}
				/>
				<TileRow
					icon={I.space}
					label={C.yourSpace}
					last
					onPress={() => actions.edit("space")}
					value={space === undefined ? undefined : spaceShown(space, companion)}
				/>
			</SettingsCard>
			<Footnote>{C.namesNote}</Footnote>
			<NameDialog
				autoCapitalize={kind === "name" ? "words" : "none"}
				copy={dialogCopy(kind, companion)}
				draft={shown?.draft ?? ""}
				error={shown?.error ?? ""}
				max={NAME_MAX[kind]}
				onCancel={actions.cancelEdit}
				onDraft={actions.setDraft}
				onReset={resettable ? actions.resetSpace : undefined}
				onSave={actions.save}
				open={dialog !== null}
			/>
		</View>
	);
}
