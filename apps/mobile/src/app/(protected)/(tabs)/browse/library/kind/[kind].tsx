import { Redirect, useLocalSearchParams } from "expo-router";
import { LibraryListScreen } from "@/features/browse/components/library-list-screen";
import { KINDS } from "@/features/library/home/library-copy";

export default function LibraryKindRoute() {
	const { kind } = useLocalSearchParams<{ kind: string }>();
	const known = KINDS.find((k) => k.kind === kind);
	// A mistyped deep link lands on the home rather than an argument error.
	if (!known) {
		return <Redirect href="/browse/library" />;
	}
	return <LibraryListScreen by={{ kind: known.kind }} />;
}
