import { useLocalSearchParams } from "expo-router";
import { ReaderData } from "@/features/letters/read/read-data";
import { ReadScreen } from "@/features/letters/read/read-screen";

export default function ReadLetterRoute() {
	const { id = "", from } = useLocalSearchParams<{
		id?: string;
		from?: string;
	}>();
	return (
		<ReaderData id={id}>
			<ReadScreen fromPush={from === "push"} />
		</ReaderData>
	);
}
