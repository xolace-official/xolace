import { cn } from "@xolace/ui/lib/utils";
import {
	CircleAlertIcon,
	CircleCheckIcon,
	TriangleAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { PublishGate } from "./publish-gate";

/** The publish checklist for any item. Each editor maps its gates to `GateItem`s. */
export function GateList({
	className,
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<ul
			aria-label="Publish checklist"
			className={cn("flex flex-col gap-3", className)}
		>
			{children}
		</ul>
	);
}

/** One gate; `children` is its fix (a button), shown only while it fails. */
export function GateItem({
	gate,
	children,
}: {
	gate: PublishGate;
	children?: ReactNode;
}) {
	return (
		<li className="flex gap-3">
			<GateIcon gate={gate} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="type-body-strong text-ink">
					{gate.label}
					<span className="sr-only">
						{gate.state === "pass" ? ": done" : ": not done"}
					</span>
				</span>
				{gate.state === "fail" ? (
					<>
						<span className="type-small text-ink-muted">{gate.help}</span>
						{children}
					</>
				) : null}
			</div>
		</li>
	);
}

function GateIcon({ gate }: { gate: PublishGate }) {
	if (gate.state === "pass") {
		return (
			<CircleCheckIcon
				aria-hidden
				className="mt-0.5 size-5 shrink-0 stroke-[2.5] text-mint-text"
			/>
		);
	}
	return gate.required ? (
		<CircleAlertIcon
			aria-hidden
			className="mt-0.5 size-5 shrink-0 stroke-[2.5] text-coral-text"
		/>
	) : (
		<TriangleAlertIcon
			aria-hidden
			className="mt-0.5 size-5 shrink-0 stroke-[2.5] text-ember-text"
		/>
	);
}

/** "2 to fix before publishing" / "All checks pass" at the top of a Publish card. */
export function GateSummary({
	blocking,
	className,
}: {
	blocking: readonly PublishGate[];
	className?: string;
}) {
	const ready = blocking.length === 0;
	return (
		<span
			className={cn(
				"type-small inline-flex items-center gap-1.5 font-semibold",
				ready ? "text-mint-text" : "text-coral-text",
				className
			)}
		>
			{ready ? (
				<CircleCheckIcon aria-hidden className="size-4 stroke-[2.5]" />
			) : (
				<CircleAlertIcon aria-hidden className="size-4 stroke-[2.5]" />
			)}
			{ready
				? "All checks pass"
				: `${blocking.length} to fix before publishing`}
		</span>
	);
}
