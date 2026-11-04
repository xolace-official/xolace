/** Dev tools row that clears the account's date of birth so the Xolacer age gate asks again
 * (#716); the server honours it only with DEV_TOOLS_ENABLED. */
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { SymbolView } from "expo-symbols";
import { useToast } from "heroui-native";
import { SettingsRow } from "@/components/shared/settings-row";
import { useTokenColor } from "@/lib/use-token-color";

const AGE_ICON = {
	android: "cake",
	ios: "birthday.cake",
	web: "cake",
} as const;

export function AgeGateDevRow() {
	const { toast } = useToast();
	const muted = useTokenColor("muted");
	const clearAgeDeclarations = useMutation(api.devTools.clearAgeDeclarations);

	const clear = async () => {
		try {
			await clearAgeDeclarations();
		} catch (e: unknown) {
			toast.show({
				description:
					e instanceof Error ? e.message : "Is DEV_TOOLS_ENABLED set?",
				label: "Clearing the date of birth failed",
				variant: "danger",
			});
			return;
		}
		toast.show({
			description: "The next Ask to talk asks for a date of birth again.",
			label: "Date of birth cleared",
		});
	};

	return (
		<SettingsRow
			icon={<SymbolView name={AGE_ICON} size={17} tintColor={muted} />}
			label="Clear date of birth"
			onPress={clear}
			variant="action"
		/>
	);
}
