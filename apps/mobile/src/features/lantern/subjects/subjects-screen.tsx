import { router, Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { FlatList, Platform, Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { COPY } from "@/features/lantern/copy";
import { subjectHref } from "@/features/lantern/lantern-links";
import {
	facetLabel,
	letterIndex,
	letterOffset,
	SUBJECTS_LAYOUT,
	subjectsList,
} from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { RowsSkeleton } from "@/features/lantern/lists/rows-skeleton";
import { useSubjectsScreen } from "@/features/lantern/subjects/subjects-data";
import { useHeaderOptions } from "@/lib/header-options";
import { useTokenColor } from "@/lib/use-token-color";

const IOS = Platform.OS === "ios";
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;

/**
 * On iOS the list runs under the see-through bar with its top inset set by hand rather than
 * `automatic`: React Native pins sticky headers at `contentInset.top`, and only knows it as a
 * prop, so a letter pins just under the bar. Android's bar is opaque and the list starts below
 * it; `contentInset` and `contentOffset` are iOS-only, so it opens at the letter by index.
 */
export function SubjectsScreen() {
	const { state } = useSubjectsScreen();
	const header = useHeaderOptions("small");
	const headerHeight = useHeaderHeight();
	const bar = IOS ? headerHeight : 0;
	const list = subjectsList(state.subjects ?? []);
	const at = letterIndex(list, state.letter);
	return (
		<>
			<Stack.Screen options={{ ...header, title: COPY.lists.subjects }} />
			{state.subjects === undefined ? (
				<View className="flex-1 bg-background" style={{ paddingTop: bar }}>
					<RowsSkeleton count={4} />
				</View>
			) : (
				<FlatList
					className="bg-background"
					contentContainerStyle={{ paddingBottom: LS.bottom }}
					contentInset={{ top: bar }}
					contentInsetAdjustmentBehavior="never"
					contentOffset={
						IOS
							? { x: 0, y: letterOffset(list, state.letter) - bar }
							: undefined
					}
					data={list.items}
					getItemLayout={(_, i) => ({
						index: i,
						length: list.heights[i],
						offset: list.offsets[i],
					})}
					initialScrollIndex={IOS || at <= 0 ? undefined : at}
					keyExtractor={(it) =>
						it.kind === "letter" ? `letter-${it.letter}` : it.slug
					}
					renderItem={({ item }) =>
						item.kind === "letter" ? (
							<LetterHeader letter={item.letter} />
						) : (
							<SubjectRow count={item.count} slug={item.slug} />
						)
					}
					scrollIndicatorInsets={{ top: bar }}
					stickyHeaderIndices={list.headers}
				/>
			)}
		</>
	);
}

function LetterHeader({ letter }: { letter: string }) {
	return (
		<View
			accessibilityRole="header"
			className="justify-end bg-background pb-1"
			style={{ height: SUBJECTS_LAYOUT.header, paddingHorizontal: LS.gutter }}
		>
			<AppText
				className="text-[13px] leading-[17px]"
				color="accent"
				variant="footnote"
				weight="bold"
			>
				{letter}
			</AppText>
		</View>
	);
}

function SubjectRow({ slug, count }: { slug: string; count: number }) {
	const subtle = useTokenColor("subtle");
	const name = facetLabel(slug);
	return (
		<Pressable
			accessibilityLabel={`${name}, ${count}`}
			accessibilityRole="link"
			className="flex-row items-center gap-2 border-separator border-b active:opacity-60"
			onPress={() => router.push(subjectHref(slug))}
			style={{ height: SUBJECTS_LAYOUT.row, marginHorizontal: LS.gutter }}
		>
			<AppText className="flex-1 text-[17px] leading-[22px]" variant="body">
				{name}
			</AppText>
			<AppText
				className="text-[14px] leading-[18px]"
				color="muted"
				variant="callout"
			>
				{count}
			</AppText>
			<Icon color={subtle} name={CHEVRON} size={12} weight="semibold" />
		</Pressable>
	);
}
