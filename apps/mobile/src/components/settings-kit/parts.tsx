import { Stack } from "expo-router";
import { Children, isValidElement, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { LABEL, S } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { useHeaderOptions } from "@/lib/header-options";
import { a11yHidden } from "@/lib/utils";

/**
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function SettingsHeader({ title }: { title: string }) {
	const header = useHeaderOptions();
	return <Stack.Screen options={{ ...header, headerShown: true, title }} />;
}

const TITLE_GAP = 10;

export function SectionTitle({
	children,
	inset = S.titleInset,
	aside,
	pb = TITLE_GAP,
}: {
	children: string;
	inset?: number;
	aside?: string;
	pb?: number;
}) {
	return (
		<View
			accessibilityRole="header"
			className="flex-row items-baseline justify-between pr-8"
			style={{ paddingBottom: pb, paddingLeft: inset }}
		>
			<AppText
				className="text-[12px] text-accent leading-4 tracking-[1.2px]"
				variant="body"
				weight="semibold"
			>
				{children.toUpperCase()}
			</AppText>
			{aside ? (
				<AppText
					className="text-[12.5px] text-foreground/50 leading-4"
					variant="body"
				>
					{aside}
				</AppText>
			) : null}
		</View>
	);
}

export function Footnote({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<AppText
			className={cn(
				"px-8 pt-2 text-[13px] text-foreground/50 leading-[19px]",
				className
			)}
			variant="body"
		>
			{children}
		</AppText>
	);
}

export function SettingsCard({
	children,
	className,
	style,
}: {
	children: ReactNode;
	className?: string;
	style?: ViewStyle;
}) {
	return (
		<View
			className={cn(
				"mx-4 overflow-hidden rounded-[22px] border-continuous bg-surface",
				className
			)}
			style={style}
		>
			{children}
		</View>
	);
}

export function Hairline({ from = S.lineFrom }: { from?: number }) {
	return (
		<View
			className="absolute right-0 bottom-0 h-px bg-separator"
			style={{ left: from }}
		/>
	);
}

export function Rows({
	children,
	from,
}: {
	children: ReactNode;
	from?: number;
}) {
	const rows = Children.toArray(children).filter(isValidElement);
	return rows.map((row, i) => (
		<View key={row.key}>
			{row}
			{i < rows.length - 1 ? <Hairline from={from} /> : null}
		</View>
	));
}

export function Label({
	children,
	className,
}: {
	children: string;
	className?: string;
}) {
	return (
		<AppText className={cn("flex-1", LABEL, className)} variant="body">
			{children}
		</AppText>
	);
}
