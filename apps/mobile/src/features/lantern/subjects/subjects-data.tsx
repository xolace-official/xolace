import { createContext, type ReactNode, use } from "react";
import type { Subject } from "@/features/lantern/lantern-model";
import { useSubjects } from "@/features/lantern/subjects/use-subjects";

/** A–Z: every subject with something in it, and the letter it opened at (`?letter=`). */
export type Subjects = {
	state: { subjects: readonly Subject[] | undefined; letter?: string };
};

const SubjectsContext = createContext<Subjects | null>(null);

export function SubjectsProvider({
	value,
	children,
}: {
	value: Subjects;
	children: ReactNode;
}) {
	return <SubjectsContext value={value}>{children}</SubjectsContext>;
}

/** The app's adapter: `getSubjects`, and the open counted once. */
export function SubjectsData({
	letter,
	children,
}: {
	letter?: string;
	children: ReactNode;
}) {
	return (
		<SubjectsProvider value={useSubjects(letter)}>{children}</SubjectsProvider>
	);
}

export function useSubjectsScreen(): Subjects {
	const value = use(SubjectsContext);
	if (!value) {
		throw new Error("useSubjectsScreen needs a SubjectsProvider above it");
	}
	return value;
}
