import type { ComponentProps } from "react";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "../copy";
import type { CardMode } from "../today-model";
import { CardField } from "./card-field";
import { CardNote, CardReady, CardWaiting } from "./card-states";
import { MonthPrompt } from "./month-prompt";

type Props = Omit<ComponentProps<typeof CardField>, "key"> & {
	mode: CardMode;
	late: boolean;
	/** The question, or the face's title while Reflect has your words. */
	prompt: string;
	/** This month's prompt, which takes the question's place (only at rest). */
	monthPrompt: string | null;
	hint: string;
	/** Remounts the field's rotating lines when the hour changes. */
	phase: string;
};

/**
 * What the card says: the question, then the field (at rest) or the face Reflect left it with
 * (your words with the mirror, the mirror back, Where to from here, or an error), then the hint.
 * Loading, the slot stays empty, so the field doesn't flash before a face.
 */
export function CardBody({
	mode,
	late,
	prompt,
	monthPrompt,
	hint,
	phase,
	running,
	reduced,
	...field
}: Props) {
	return (
		<>
			{monthPrompt ? (
				<MonthPrompt prompt={monthPrompt} />
			) : (
				<AppText
					center={late}
					className={late ? "px-2.5 pt-2" : "pr-7.5"}
					variant="prompt"
				>
					{prompt}
				</AppText>
			)}
			{mode === "waiting" ? (
				<CardWaiting running={running && !reduced} />
			) : null}
			{mode === "ready" ? <CardReady running={running && !reduced} /> : null}
			{mode === "next" ? (
				<CardNote body={COPY.card.next.body} tone="ember" />
			) : null}
			{mode === "failed" ? (
				<CardNote body={COPY.card.failed.body} tone="subtle" />
			) : null}
			{mode === "idle" ? (
				<CardField key={phase} reduced={reduced} running={running} {...field} />
			) : null}
			{/* Until the session is known the hint keeps its line, unread and unseen. */}
			<AppText
				accessibilityElementsHidden={mode === "loading"}
				center
				className={mode === "loading" ? "opacity-0" : undefined}
				color="muted"
				variant="footnote"
			>
				{hint}
			</AppText>
		</>
	);
}
