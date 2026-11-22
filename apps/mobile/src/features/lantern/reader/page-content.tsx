import type { ReactNode } from "react";
import { View } from "react-native";
import { Credits, EndOfRead } from "@/features/lantern/reader/end-of-read";
import { ReaderBody } from "@/features/lantern/reader/reader-body";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import {
	HelplineLink,
	ReflectOnThis,
} from "@/features/lantern/reader/reader-extras";
import {
	ContentNote,
	SourceCredit,
} from "@/features/lantern/reader/source-credit";

export function PageContent({
	title,
	onArticleEnd,
}: {
	title: ReactNode;
	onArticleEnd: (y: number) => void;
}) {
	const { contentNote } = useReaderScreen().state.entry;
	return (
		<>
			{title ? <View className="mb-6">{title}</View> : null}
			<SourceCredit />
			{contentNote ? <ContentNote note={contentNote} /> : null}
			<ReaderBody />
			<Credits
				onLayout={(e) =>
					onArticleEnd(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
				}
			/>
			<EndOfRead />
			<ReflectOnThis />
			<HelplineLink />
		</>
	);
}
