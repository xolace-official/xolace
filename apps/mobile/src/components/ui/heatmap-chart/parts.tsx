import { Children, isValidElement, type ReactNode } from "react";
import type { Slot } from "./context";

export interface Parts {
	cells: ReactNode[];
	columns: number;
	header: ReactNode[];
	legend: ReactNode[];
	rules: ReactNode[];
	tooltip: ReactNode[];
	x: ReactNode | null;
	y: React.ReactElement<{ width?: number }> | null;
}

export function splitParts(children: ReactNode): Parts {
	const parts: Parts = {
		cells: [],
		columns: 0,
		header: [],
		legend: [],
		rules: [],
		tooltip: [],
		x: null,
		y: null,
	};

	Children.forEach(children, (child, index) => {
		if (!isValidElement(child)) {
			return;
		}
		const slot = (child.type as { slot?: Slot }).slot ?? "cells";
		const keyed = <ChildSlot key={index}>{child}</ChildSlot>;

		if (slot === "x-axis") {
			parts.x = keyed;
		} else if (slot === "y-axis") {
			parts.y = child as React.ReactElement<{ width?: number }>;
		} else if (slot === "rules") {
			parts.rules.push(keyed);
		} else if (slot === "tooltip") {
			parts.tooltip.push(keyed);
		} else if (slot === "legend") {
			parts.legend.push(keyed);
		} else if (slot === "header") {
			parts.header.push(keyed);
		} else {
			parts.cells.push(keyed);
		}
	});

	return parts;
}

function ChildSlot({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
