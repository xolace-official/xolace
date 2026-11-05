// The date of birth as Material 3's date dialog behind a field (Expo UI's Jetpack Compose). iOS uses
// SwiftUI's wheel (`date-of-birth-picker.ios.tsx`).
//
// The dialog, not the inline picker: the inline one reports a selection on mount even with none
// made, as epoch 0, which is indistinguishable from someone born on 1 January 1970.

import { Host } from "@expo/ui";
import { DatePickerDialog } from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { Pressable } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useAppTheme } from "@/context/app-theme-context";
import { playSoftPress } from "@/lib/haptics";

const DAY = "YYYY-MM-DD".length;

/** "1 May 1990", without a timezone shift: the day is read back as UTC. */
const formatDay = (day: string) =>
	new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
		day: "numeric",
		month: "long",
		timeZone: "UTC",
		year: "numeric",
	});

export function DateOfBirthPicker({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (dateOfBirth: string) => void;
}) {
	const { isDark } = useAppTheme();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Pressable
				accessibilityLabel="Date of birth"
				accessibilityRole="button"
				accessibilityValue={{ text: value ? formatDay(value) : "Not set" }}
				className="rounded-2xl border border-border bg-surface px-4 py-3.5"
				onPress={() => {
					playSoftPress();
					setOpen(true);
				}}
			>
				<AppText className="text-[12px] text-muted">Date of birth</AppText>
				<AppText className="text-[16px] text-foreground">
					{value ? formatDay(value) : "Choose a date"}
				</AppText>
			</Pressable>
			{open && (
				<Host colorScheme={isDark ? "dark" : "light"} matchContents>
					<DatePickerDialog
						initialDate={value}
						onDateSelected={(date) => {
							// Material reports the picked day as UTC midnight.
							onChange(date.toISOString().slice(0, DAY));
							setOpen(false);
						}}
						onDismissRequest={() => setOpen(false)}
						selectableDates={{ end: new Date() }}
					/>
				</Host>
			)}
		</>
	);
}
