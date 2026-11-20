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

const WHEEL_HEIGHT = 216;
const FILL = 10_000;

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
			<ThemedHost style={{ height: WHEEL_HEIGHT, width: "100%" }}>
				<DatePicker
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
