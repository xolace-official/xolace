// The date of birth as SwiftUI's wheel, the picker iOS uses for birthdays. Android opens Material 3's
// date dialog (`date-of-birth-picker.tsx`).

import { Host } from "@expo/ui";
import { DatePicker } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";
import { useAppTheme } from "@/context/app-theme-context";
import { calendarDate } from "./age-gate-step";

/** Local midnight of a "YYYY-MM-DD" day, so the wheel shows that day in every timezone. */
const toLocalDate = (day: string) => {
	const [year, month, date] = day.split("-").map(Number);
	return new Date(year, month - 1, date);
};

export function DateOfBirthPicker({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (dateOfBirth: string) => void;
}) {
	const { isDark } = useAppTheme();
	const today = new Date();
	return (
		<Host
			colorScheme={isDark ? "dark" : "light"}
			matchContents={{ vertical: true }}
		>
			<DatePicker
				modifiers={[datePickerStyle("wheel")]}
				onDateChange={(date) => onChange(calendarDate(date))}
				range={{ end: today }}
				selection={value ? toLocalDate(value) : today}
				title="Date of birth"
			/>
		</Host>
	);
}
