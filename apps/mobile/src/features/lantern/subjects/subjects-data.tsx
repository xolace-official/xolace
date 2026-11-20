import { createContext, type ReactNode, use } from "react";
import type { Subject } from "@/features/lantern/lantern-model";
import { useSubjects } from "@/features/lantern/subjects/use-subjects";

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
