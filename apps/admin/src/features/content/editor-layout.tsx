import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@xolace/ui/components/card";
import type { ReactNode } from "react";

/**
 * "Document + rail" (docs/plan/admin-v1.md, "Decided"): the item's content runs down
 * one column; a sticky rail holds what it takes to ship it.
 */
export function EditorLayout({ children }: { children: ReactNode }) {
	return (
		<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
			{children}
		</div>
	);
}

export function EditorMain({ children }: { children: ReactNode }) {
	return <div className="flex min-w-0 flex-col gap-8">{children}</div>;
}

export function EditorRail({ children }: { children: ReactNode }) {
	return (
		<aside
			aria-label="Publishing"
			className="flex flex-col gap-6 lg:sticky lg:top-24"
		>
			{children}
		</aside>
	);
}

/** A titled card in the column or the rail (`size="sm"`). */
export function EditorPanel({
	title,
	size,
	children,
}: {
	title: string;
	size?: "sm";
	children: ReactNode;
}) {
	return (
		<Card size={size}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
