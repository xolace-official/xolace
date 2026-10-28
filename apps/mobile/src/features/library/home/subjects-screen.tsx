/**
 * Lantern A–Z (#396): every subject with active entries, grouped by letter,
 * with counts. `?letter=` jumps to that letter.
 */

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { Pressable, SectionList, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { trackLibrary } from "@/features/library/analytics";
import { facetLabel } from "@/features/library/home/library-copy";
import { SubjectsSkeleton } from "@/features/library/skeletons";

type Subject = { slug: string; count: number };

export function SubjectsScreen() {
	const { letter } = useLocalSearchParams<{ letter?: string }>();
	const loaded = useQuery(api.library.home.getSubjects, {});
	const subjects = loaded ?? [];
	const ref = useRef<SectionList<Subject>>(null);
	// Jump to `?letter=` once; later content-size changes (virtualized rows mounting) must not snap back.
	const jumped = useRef(false);
	const muted = useThemeColor("muted");
	const posthog = usePostHog();

	useEffect(() => {
		trackLibrary(posthog, "library_subjects_opened", {
			letter: letter ?? null,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const sections = [
		...new Set(subjects.map((s) => s.slug[0].toUpperCase())),
	].map((title) => ({
		data: subjects.filter((s) => s.slug[0].toUpperCase() === title),
		title,
	}));
	const start = sections.findIndex((s) => s.title === letter);

	if (loaded === undefined) {
		return <SubjectsSkeleton />;
	}
	return (
		<SectionList
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 120 }}
			contentInsetAdjustmentBehavior="automatic"
			keyExtractor={(s) => s.slug}
			onContentSizeChange={() => {
				if (start <= 0 || jumped.current) {
					return;
				}
				jumped.current = true;
				ref.current?.scrollToLocation({
					animated: false,
					itemIndex: 0,
					sectionIndex: start,
				});
			}}
			onScrollToIndexFailed={() => {}}
			ref={ref}
			renderItem={({ item }) => (
				<Pressable
					accessibilityLabel={`${facetLabel(item.slug)}, ${item.count}`}
					accessibilityRole="link"
					className="mx-4 flex-row items-center border-border border-b py-3.5 active:opacity-60"
					onPress={() =>
						router.push({
							params: { slug: item.slug },
							pathname: "/browse/library/subject/[slug]",
						})
					}
				>
					<AppText className="flex-1 text-[17px]">
						{facetLabel(item.slug)}
					</AppText>
					<AppText className="pr-2 text-[14px] text-muted">
						{item.count}
					</AppText>
					<SymbolView
						name={{
							android: "chevron_right",
							ios: "chevron.right",
							web: "chevron_right",
						}}
						size={12}
						tintColor={muted}
					/>
				</Pressable>
			)}
			renderSectionHeader={({ section }) => (
				<View className="bg-background px-4 pt-4 pb-1">
					<AppText className="font-bold text-[13px] text-accent">
						{section.title}
					</AppText>
				</View>
			)}
			sections={sections}
			stickySectionHeadersEnabled
		/>
	);
}
