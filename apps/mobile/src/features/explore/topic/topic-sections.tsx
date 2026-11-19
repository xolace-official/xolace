import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { TopicFilter } from "@/features/explore/copy";
import {
	type ExploreTrack,
	type Listen,
	topicMeta,
	topicSections,
} from "@/features/explore/explore-model";
import { TOPIC } from "@/features/explore/explore-style";
import { TrackRow } from "@/features/explore/rows/track-row";
import { KindIcon } from "@/features/explore/topic/kind-icon";
import { SeriesRow } from "@/features/explore/topic/series-row";

/** A topic's grouped list (handoff `explore-doors.md` §4.3). Headings only when two or more show. */
export function TopicSections({
	tracks,
	filter,
	chips,
	listen,
}: {
	tracks: readonly ExploreTrack[];
	filter: TopicFilter;
	chips: boolean;
	listen: Listen;
}) {
	const secs = topicSections(tracks, filter);
	const heads = secs.length > 1;
	return (
		<View style={{ paddingTop: chips ? 0 : TOPIC.soloTop }}>
			{secs.map((s, i) => (
				<View key={s.key}>
					{heads ? <Heading first={i === 0} text={s.heading} /> : null}
					{s.tracks.map((t, j) =>
						s.kind === "series" ? (
							<SeriesRow key={t._id} listen={listen} rule={j > 0} track={t} />
						) : (
							<TrackRow
								end={<KindIcon music={t.family === "music"} />}
								key={t._id}
								kind
								listen={listen}
								meta={topicMeta(t)}
								rule={j > 0}
								track={t}
							/>
						)
					)}
				</View>
			))}
		</View>
	);
}

/** 13 semibold, uppercase, 0.06 em, muted; a VoiceOver header. */
function Heading({ text, first }: { text: string; first: boolean }) {
	const k = TOPIC.kick;
	return (
		<AppText
			accessibilityRole="header"
			className="uppercase leading-[16px] tracking-[0.78px]"
			color="muted"
			style={{
				paddingBottom: k.bottom,
				paddingHorizontal: k.x,
				paddingTop: first ? k.firstTop : k.top,
			}}
			variant="footnote"
			weight="semibold"
		>
			{text}
		</AppText>
	);
}
