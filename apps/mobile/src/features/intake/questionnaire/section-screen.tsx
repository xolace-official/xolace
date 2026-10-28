import type { ImageProps } from "expo-image";
import { usePostHog } from "posthog-react-native";
/**
 * One section of questions, one step.
 *
 * The questionnaire card is *only* the questions: mascot bubble above it says
 * why this section is being asked, the card pages through the section's own
 * questions, and the screen ends when the section does. Interstitials are
 * their own screens (see `conversation.tsx`), never pages in here.
 */
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	Questionnaire,
	type QuestionnaireAnswers,
	type QuestionnaireItemDefinition,
} from "@/components/ui/questionnaire";
import {
	stepKeyOfAnswer,
	trackQuestionAnswered,
	trackStepViewed,
} from "@/features/intake/analytics";
import { applyCap } from "@/features/intake/answer-rules";
import { IntakeScreen } from "@/features/intake/questionnaire/intake-screen";
import { MascotSays } from "@/features/intake/questionnaire/mascot";
import type { IntakeQuestion } from "@/features/intake/questions";

const NO_CAPS: readonly string[] = [];

interface SectionScreenProps {
	/** Multi-selects to hold at MAX_SELECTIONS. */
	capped?: readonly string[];
	/** Extra `Questionnaire.Item`s after the section's own — the series branch. */
	children?: ReactNode;
	/** "Section 1 of 3 · You" — the only place the section is named. */
	eyebrow: string;
	items: readonly QuestionnaireItemDefinition[];
	/** The pose for this section. Defaults to the talking one. */
	mascot?: ImageProps["source"];
	onChange?: (answers: QuestionnaireAnswers) => void;
	onDone: (answers: QuestionnaireAnswers) => void;
	questions: readonly IntakeQuestion[];
	/** What the mascot says about this section. */
	says: string;
	submitLabel?: string;
	title: string;
	/** Lift the answers out when the screen branches on one of them. */
	value?: QuestionnaireAnswers;
}

/*
 * A plain function, not a component: the root finds its questions by
 * `child.type === Questionnaire.Item` in one shallow pass, so a wrapper
 * component would hide the whole set from it.
 */
function renderQuestion(question: IntakeQuestion) {
	return (
		<Questionnaire.Item
			key={question.name}
			multiple={question.multiple}
			name={question.name}
			required
		>
			<Questionnaire.Question>{question.question}</Questionnaire.Question>
			{question.description ? (
				<Questionnaire.Description>
					{question.description}
				</Questionnaire.Description>
			) : null}
			<Questionnaire.Choices columns={question.twoUp ? 2 : 1}>
				{question.choices.map((choice) => (
					<Questionnaire.Choice
						key={choice.value}
						label={choice.label}
						value={choice.value}
					/>
				))}
			</Questionnaire.Choices>
			<Questionnaire.Error />
		</Questionnaire.Item>
	);
}

export function SectionScreen({
	eyebrow,
	title,
	says,
	mascot,
	questions,
	items,
	capped = NO_CAPS,
	submitLabel = "Continue",
	onDone,
	children,
	value,
	onChange,
}: SectionScreenProps) {
	const [own, setOwn] = useState<QuestionnaireAnswers>({});
	const answers = value ?? own;
	const setAnswers = onChange ?? setOwn;
	const scroller = useRef<ScrollViewInstance>(null);

	/*
	 * The funnel's per-question steps (T7, #267) are only visible from in here:
	 * a section is one route, and the questions inside it are paged by the
	 * questionnaire itself.
	 */
	const posthog = usePostHog();
	const active = useRef<string | null>(null);
	const orderOf = (name: string) =>
		items.findIndex((item) => item.name === name);

	useEffect(() => {
		// The first question — the only one `onItemChange` never reports, since
		// nothing moved to it.
		const first = items.find((item) => !item.disabled)?.name;
		const key = first ? stepKeyOfAnswer(first) : undefined;
		if (!(first && key)) {
			return;
		}
		active.current = first;
		trackStepViewed(posthog, key);
		// Mount only: `items` is rebuilt every render, and the branch can only
		// ever append questions after this one.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const trackCommit = (name: string | null, from: QuestionnaireAnswers) => {
		const key = name ? stepKeyOfAnswer(name) : undefined;
		const answer = name ? from[name] : undefined;
		if (key && answer !== undefined) {
			trackQuestionAnswered(posthog, key, answer);
		}
	};

	return (
		<IntakeScreen>
			<ScrollView
				contentContainerClassName="px-5 pt-3 pb-16 gap-5"
				keyboardShouldPersistTaps="handled"
				ref={scroller}
				showsVerticalScrollIndicator={false}
			>
				<View className="gap-1">
					<AppText className="font-[Poppins-Medium] text-[11px] text-foreground/40 uppercase tracking-widest">
						{eyebrow}
					</AppText>
					<AppText className="font-[Poppins-SemiBold] text-2xl text-foreground">
						{title}
					</AppText>
				</View>

				<MascotSays source={mascot}>{says}</MascotSays>

				<Questionnaire
					answers={answers}
					items={items}
					onAnswersChange={(next) => setAnswers(applyCap(next, capped))}
					// Only the active question is mounted, but the scroller is ours and
					// keeps its offset — so a long list like Q3 would drop the next
					// question in mid-page with its own text scrolled off the top.
					onItemChange={(name) => {
						scroller.current?.scrollTo({ animated: true, y: 0 });
						const previous = active.current;
						active.current = name;
						const key = stepKeyOfAnswer(name);
						if (key) {
							trackStepViewed(posthog, key);
						}
						// Only a forward move is an answer being committed: the way on is
						// gated on an answer, the way back isn't, and the answer a back
						// step leaves behind was recorded on the way in.
						if (previous && orderOf(name) > orderOf(previous)) {
							trackCommit(previous, answers);
						}
					}}
					onSubmit={(final) => {
						trackCommit(active.current, final);
						onDone(final);
					}}
					swipeable
				>
					<Questionnaire.Progress variant="pips" />
					{questions.map(renderQuestion)}
					{children}
					<Questionnaire.Footer>
						<Questionnaire.Back />
						<Questionnaire.Spacer />
						<Questionnaire.Next />
						<Questionnaire.Submit>{submitLabel}</Questionnaire.Submit>
					</Questionnaire.Footer>
				</Questionnaire>
			</ScrollView>
		</IntakeScreen>
	);
}
