import {
	SPECIALTIES,
	specialtyLabel,
} from "@xolace/backend/convex/lib/specialties";
import { PressableFeedback } from "heroui-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { playSoftPress } from "@/src/lib/haptics";
import { cn } from "@/src/lib/utils";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

/** The tags a xolacer declared, on a roster row or under a profile bio. */
export function SpecialtyChips({
	specialties,
	muted = false,
	className,
}: {
	specialties: readonly string[];
	muted?: boolean;
	className?: string;
}) {
	if (specialties.length === 0) {
		return null;
	}

	return (
		<View className={cn("flex-row flex-wrap gap-1.5", className)}>
			{specialties.map((slug) => (
				<View
					className={cn(
						"rounded-lg px-2 py-1",
						muted ? "bg-surface-tertiary" : "bg-accent/10"
					)}
					key={slug}
					style={styles.borderCurve}
				>
					<AppText
						className={cn(
							"font-medium text-[11px]",
							muted ? "text-muted" : "text-accent"
						)}
					>
						{specialtyLabel(slug)}
					</AppText>
				</View>
			))}
		</View>
	);
}

/**
 * Roster filter. Only tags somebody on the roster actually declared are
 * offered — a filter that returns nothing is worse than no filter, and with
 * six xolacers most of the taxonomy is empty on any given day.
 *
 * Filtering happens client-side over the already-loaded directory, so tapping
 * a chip costs no round trip and can't blank the list mid-interaction.
 */
export function SpecialtyFilter({
	available,
	selected,
	onSelect,
}: {
	available: readonly string[];
	selected: string | null;
	onSelect: (slug: string | null) => void;
}) {
	const offered = SPECIALTIES.filter((specialty) =>
		available.includes(specialty.slug)
	);
	if (offered.length < 2) {
		return null;
	}

	return (
		<ScrollView
			contentContainerClassName="gap-2 px-0.5"
			horizontal
			keyboardShouldPersistTaps="handled"
			showsHorizontalScrollIndicator={false}
		>
			<FilterChip
				active={selected === null}
				label="Everyone"
				onPress={() => onSelect(null)}
			/>
			{offered.map((specialty) => (
				<FilterChip
					active={selected === specialty.slug}
					key={specialty.slug}
					label={specialty.label}
					onPress={() =>
						onSelect(selected === specialty.slug ? null : specialty.slug)
					}
				/>
			))}
		</ScrollView>
	);
}

function FilterChip({
	label,
	active,
	onPress,
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	return (
		<PressableFeedback
			accessibilityLabel={`Show ${label}`}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			onPress={() => {
				playSoftPress();
				onPress();
			}}
		>
			<View
				className={cn(
					"rounded-full border px-3 py-1.5",
					active ? "border-accent bg-accent/12" : "border-border/55 bg-surface"
				)}
				style={styles.borderCurve}
			>
				<AppText
					className={cn(
						"text-xs",
						active ? "font-semibold text-accent" : "font-medium text-muted"
					)}
				>
					{label}
				</AppText>
			</View>
		</PressableFeedback>
	);
}
