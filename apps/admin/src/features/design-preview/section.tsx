import type { ReactNode } from "react";

export function Section({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="mt-12">
			<h2 className="type-h2 mb-4 text-ink">{title}</h2>
			{children}
		</section>
	);
}
