import { createElement, useEffect, useState } from "react";

export interface ChartAccessibilityProps<Datum> {
	/** Additional guidance spoken after the chart summary. */
	accessibilityHint?: string;
	/** Spoken summary. Defaults to the chart family and number of data entries. */
	accessibilityLabel?: string;
	/** Overrides the spoken label for one data entry. */
	accessibilityLabelForDatum?: (datum: Datum, index: number) => string;
	/** Makes each data entry actionable without making the SVG geometry focusable. */
	onAccessibilityDatumPress?: (datum: Datum, index: number) => void;
}

export interface ChartAccessibilityItem<Datum> {
	datum: Datum;
	index: number;
	label: string;
}

function spoken(value: unknown): string | null {
	if (value instanceof Date) {
		return value.toLocaleDateString();
	}
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	return null;
}

function chartSummary(chart: string, count: number): string {
	return `${chart}, ${count} ${count === 1 ? "data entry" : "data entries"}`;
}

/** Pure semantic projection, shared by tests and the native accessibility tree. */
export function chartAccessibilityModel<Datum>(
	chart: string,
	data: Datum[],
	valueOf: (datum: Datum) => [string, unknown][],
	labelForDatum?: (datum: Datum, index: number) => string
): { summary: string; items: ChartAccessibilityItem<Datum>[] } {
	return {
		items: data.map((datum, index) => ({
			datum,
			index,
			label:
				labelForDatum?.(datum, index) ??
				valueOf(datum)
					.map(([label, value]) => {
						const text = spoken(value);
						return text === null ? null : `${label}, ${text}`;
					})
					.filter((part): part is string => part !== null)
					.join(". "),
		})),
		summary: chartSummary(chart, data.length),
	};
}

export interface ChartAccessibilityDataProps<Datum>
	extends ChartAccessibilityProps<Datum> {
	chart: string;
	data: Datum[];
	disabled?: boolean;
	valueOf: (datum: Datum) => [string, unknown][];
}

/**
 * Whether VoiceOver / TalkBack is on. Per-datum elements cost one native view
 * and one spoken label per datum, so they are only built for someone who can
 * hear them.
 */
function useScreenReaderEnabled(): boolean {
	const [enabled, setEnabled] = useState(false);
	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { AccessibilityInfo } =
			require("react-native") as typeof import("react-native");
		let settled = false;
		const subscription = AccessibilityInfo.addEventListener(
			"screenReaderChanged",
			(next) => {
				settled = true;
				setEnabled(next);
			}
		);
		// A change event that lands first is newer than this answer.
		AccessibilityInfo.isScreenReaderEnabled().then((next) => {
			if (!settled) {
				setEnabled(next);
			}
		});
		return () => {
			settled = true;
			subscription.remove();
		};
	}, []);
	return enabled;
}

/**
 * A compact semantic sibling to the visual plot. The SVG remains one
 * decorative subtree while screen readers receive one summary and one entry
 * per datum, rather than every path, grid line and marker. The summary is
 * always present; the per-datum entries only while a screen reader is on.
 */
export function ChartAccessibilityData<Datum>({
	chart,
	data,
	valueOf,
	disabled = false,
	accessibilityLabel,
	accessibilityHint,
	accessibilityLabelForDatum,
	onAccessibilityDatumPress,
}: ChartAccessibilityDataProps<Datum>) {
	const screenReader = useScreenReaderEnabled();
	if (disabled) {
		return null;
	}
	// Keep the pure semantic projection importable by Node tests without asking
	// Node to parse React Native's Flow entry point.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { Pressable, View } =
		require("react-native") as typeof import("react-native");
	const items = screenReader
		? chartAccessibilityModel(chart, data, valueOf, accessibilityLabelForDatum)
				.items
		: [];

	return createElement(
		View,
		{ style: { height: 1, left: -10_000, position: "absolute", width: 1 } },
		createElement(View, {
			accessibilityHint,
			accessibilityLabel:
				accessibilityLabel ?? chartSummary(chart, data.length),
			accessibilityRole: "image",
			accessible: true,
		}),
		...items.map((item) =>
			createElement(Pressable, {
				accessibilityLabel: item.label,
				accessibilityRole: onAccessibilityDatumPress ? "button" : "text",
				accessible: true,
				key: item.index,
				onPress: onAccessibilityDatumPress
					? () => onAccessibilityDatumPress(item.datum, item.index)
					: undefined,
			})
		)
	);
}
