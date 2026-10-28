// §3 Finding us: Q8, Q9 and the one branch. The only step that lifts its answers out
// of `SectionScreen`, because Q9 decides whether Q10/Q11 exist.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	Questionnaire,
	type QuestionnaireAnswers,
} from "@/components/ui/questionnaire";
import { MASCOT_MAP } from "@/features/intake/questionnaire/mascot";
import { SectionScreen } from "@/features/intake/questionnaire/section-screen";
import {
	SECTION_FINDING,
	SERIES_BRANCH_VALUE,
	SERIES_NOT_SEEN,
	SERIES_SEEN_RATINGS,
	SERIES_WANT_CHOICES,
	SERIES_WANT_QUESTION,
} from "@/features/intake/questions";
import { playTextureSelect } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const BASE = SECTION_FINDING.map((q) => ({ name: q.name, required: true }));

export function FindingStep({
	onDone,
}: {
	onDone: (answers: QuestionnaireAnswers) => void;
}) {
	const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
	// Q10's "Yes" reveals the ratings; the rating is the answer, so Yes is local. The two
	// must clear each other or a screen reader announces two chosen radios in one group.
	const [seen, setSeen] = useState(false);

	const chooseYes = () => {
		playTextureSelect();
		setSeen(true);
		if (answers.seriesSeen !== SERIES_NOT_SEEN) {
			return;
		}
		const { seriesSeen: _cleared, ...rest } = answers;
		setAnswers(rest);
	};

	const branched = answers.acquisitionSource === SERIES_BRANCH_VALUE;
	const items = [
		...BASE,
		{ disabled: !branched, name: "seriesSeen", required: true },
		{ disabled: !branched, name: "seriesWantInApp", required: true },
	];

	return (
		<SectionScreen
			eyebrow="Section 3 of 3 · Finding us"
			items={items}
			mascot={MASCOT_MAP}
			onChange={(next) => {
				if (next.seriesSeen === SERIES_NOT_SEEN) {
					setSeen(false);
				}
				setAnswers(next);
			}}
			onDone={onDone}
			questions={SECTION_FINDING}
			says="Last few. This part is for us — it tells us where people like you are finding Xolace."
			submitLabel="Done"
			title="How you got here"
			value={answers}
		>
			<Questionnaire.Item disabled={!branched} name="seriesSeen" required>
				<Questionnaire.Question>
					Have you seen the series?
				</Questionnaire.Question>
				<Questionnaire.Choices>
					<Pressable
						accessibilityRole="radio"
						accessibilityState={{ selected: seen }}
						className={cn(
							"w-full rounded-xl border px-3.5 py-3",
							seen ? "border-accent bg-accent/10" : "border-border bg-surface"
						)}
						onPress={chooseYes}
					>
						<AppText className="font-[Poppins-Medium] text-base text-foreground">
							Yes
						</AppText>
					</Pressable>
					{seen
						? SERIES_SEEN_RATINGS.map((choice) => (
								<View className="pl-6" key={choice.value}>
									<Questionnaire.Choice
										label={choice.label}
										value={choice.value}
									/>
								</View>
							))
						: null}
					<Questionnaire.Choice label="No, not yet" value={SERIES_NOT_SEEN} />
				</Questionnaire.Choices>
				<Questionnaire.Error />
			</Questionnaire.Item>

			<Questionnaire.Item disabled={!branched} name="seriesWantInApp" required>
				<Questionnaire.Question>{SERIES_WANT_QUESTION}</Questionnaire.Question>
				<Questionnaire.Choices>
					{SERIES_WANT_CHOICES.map((choice) => (
						<Questionnaire.Choice
							key={choice.value}
							label={choice.label}
							value={choice.value}
						/>
					))}
				</Questionnaire.Choices>
				<Questionnaire.Error />
			</Questionnaire.Item>
		</SectionScreen>
	);
}
