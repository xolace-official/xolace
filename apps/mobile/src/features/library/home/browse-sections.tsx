/**
 * The home's last two sections (#396, carried over from variant C): "What
 * kind of light" kind rows and the A–Z letter strip. Letters with no
 * subject are dimmed.
 */

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SectionTitle } from "@/features/library/home/entry-cards";
import { KINDS, type Kind } from "@/features/library/home/library-copy";
import { cn } from "@/lib/utils";

const KIND_FLUX: Record<Kind, number> = {
	advice: require("@/assets/images/flux/flux-campfire.png"),
	explainer: require("@/assets/images/flux/writer-flux.png"),
	story: require("@/assets/images/flux/flux-pair-listening.png"),
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const openSubjects = (letter?: string) =>
	router.push({
		params: letter ? { letter } : {},
		pathname: "/browse/library/subjects",
	});

export function KindRows() {
	return (
		<>
			<SectionTitle title="What kind of light" />
			<View className="gap-2.5 px-4">
				{KINDS.map((k) => (
					<Pressable
						accessibilityLabel={`${k.label}. ${k.line}`}
						accessibilityRole="link"
						className="flex-row items-center gap-4 rounded-[22px] bg-surface py-2 pr-2 pl-5 active:opacity-80"
						key={k.kind}
						onPress={() =>
							router.push({
								params: { kind: k.kind },
								pathname: "/browse/library/kind/[kind]",
							})
						}
					>
						<View className="flex-1">
							<AppText className="font-semibold text-[17px]">{k.label}</AppText>
							<AppText className="text-[14px] text-muted">{k.line}</AppText>
						</View>
						<Image
							contentFit="contain"
							source={KIND_FLUX[k.kind]}
							style={{ height: 64, width: 64 }}
						/>
					</Pressable>
				))}
			</View>
		</>
	);
}

export function LetterStrip() {
	const subjects = useQuery(api.library.home.getSubjects, {});
	if (!subjects?.length) {
		return null;
	}
	const has = new Set(subjects.map((s) => s.slug[0]?.toUpperCase()));
	return (
		<>
			<SectionTitle
				action="All subjects"
				onAction={() => openSubjects()}
				title="A–Z"
			/>
			<View className="flex-row flex-wrap justify-between gap-y-1.5 px-4">
				{LETTERS.map((l) => (
					<Pressable
						accessibilityLabel={`Subjects starting with ${l}`}
						accessibilityRole="link"
						accessibilityState={{ disabled: !has.has(l) }}
						className="h-9 w-9 items-center justify-center rounded-full active:bg-surface-secondary"
						disabled={!has.has(l)}
						key={l}
						onPress={() => openSubjects(l)}
					>
						<AppText
							className={cn(
								"text-[16px]",
								has.has(l) ? "font-semibold" : "text-muted/40"
							)}
						>
							{l}
						</AppText>
					</Pressable>
				))}
			</View>
		</>
	);
}
