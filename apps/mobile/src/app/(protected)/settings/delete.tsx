import { useLocalSearchParams } from "expo-router";
import { wipeReflectDraft } from "@/features/reflect/reflect-draft";
import { DeleteSheetScreen } from "@/features/settings/privacy/delete/delete-sheet";
import { DeleteSheetData } from "@/features/settings/privacy/delete/delete-sheet-data";
import { sheetKind } from "@/features/settings/privacy/privacy-model";

/**
 * Privacy & Data's delete sheet, `?kind=data|account`: a form sheet over the page
 * (`settings/_layout.tsx`). A data wipe also clears Reflect's unsent draft on this phone,
 * composed in here: features meet in routes.
 */
export default function DeleteRoute() {
	const { kind } = useLocalSearchParams<{ kind?: string }>();
	return (
		<DeleteSheetData kind={sheetKind(kind)} onDataWiped={wipeReflectDraft}>
			<DeleteSheetScreen />
		</DeleteSheetData>
	);
}
