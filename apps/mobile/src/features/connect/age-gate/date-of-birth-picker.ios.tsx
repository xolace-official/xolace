// The date of birth as SwiftUI's wheel, the picker iOS uses for birthdays, in a well card. Android
// opens Material 3's date dialog (`date-of-birth-picker.tsx`).

import { DatePicker } from "@expo/ui/swift-ui";
import {
	datePickerStyle,
	frame,
	labelsHidden,
} from "@expo/ui/swift-ui/modifiers";
import { View } from "react-native";
import { ThemedHost } from "@/components/shared/themed-host";
import { calendarDate } from "./age-gate-step";
import { AGE } from "./copy";

/** UIKit's standard wheel picker height, in points. */
const WHEEL_HEIGHT = 216;
/** SwiftUI's `.infinity`: the wheel spans the card. */
const FILL = 10_000;

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
	const today = new Date();
	return (
		<View
			className="overflow-hidden rounded-[18px] border-continuous bg-surface-secondary"
			style={{ height: WHEEL_HEIGHT }}
		>
			{/* A fixed height, not `matchContents`: inside a sheet the measured height can arrive
			    late and the wheel renders at zero height. */}
			<ThemedHost style={{ height: WHEEL_HEIGHT, width: "100%" }}>
				<DatePicker
					// The sheet's heading asks the question; the title stays as the accessibility label.
					modifiers={[
						datePickerStyle("wheel"),
						labelsHidden(),
						frame({ maxWidth: FILL }),
					]}
					onDateChange={(date) => onChange(calendarDate(date))}
					range={{ end: today }}
					selection={value ? toLocalDate(value) : today}
					title={AGE.ask.picker}
				/>
			</ThemedHost>
		</View>
	);
}
