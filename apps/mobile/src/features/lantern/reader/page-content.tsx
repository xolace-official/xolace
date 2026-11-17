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

/**
 * The sheet's content, in production's order (handoff §5.2): the source credit with the Listen
 * pill, the content note, the body, the credits, the end of the read, Reflect on this and the
 * helpline. `title` is the title when it sits on the page (accessibility sizes).
 */
export function PageContent({
	title,
	onArticleEnd,
}: {
	title: ReactNode;
	/** The article's last line, in sheet coordinates: the read signals' end. */
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
