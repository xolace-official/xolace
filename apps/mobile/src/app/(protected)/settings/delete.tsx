import { useLocalSearchParams } from "expo-router";
import { wipeReflectDraft } from "@/features/reflect/reflect-draft";
import { DeleteSheetScreen } from "@/features/settings/privacy/delete/delete-sheet";
import { DeleteSheetData } from "@/features/settings/privacy/delete/delete-sheet-data";
import { sheetKind } from "@/features/settings/privacy/privacy-model";

export default function DeleteRoute() {
	const { kind } = useLocalSearchParams<{ kind?: string }>();
	return (
		<DeleteSheetData kind={sheetKind(kind)} onDataWiped={wipeReflectDraft}>
			<DeleteSheetScreen />
		</DeleteSheetData>
	);
}
