import { createElement, useEffect, useState } from "react";

export interface ChartAccessibilityProps<Datum> {
	accessibilityHint?: string;
	accessibilityLabel?: string;
	accessibilityLabelForDatum?: (datum: Datum, index: number) => string;
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

function useScreenReaderEnabled(): boolean {
	const [enabled, setEnabled] = useState(false);
	useEffect(() => {
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
