import { card, type EntrySlug } from "@/features/lantern/dev/entries";
import type { ReaderEntry } from "@/features/lantern/reader/reader-model";

const NIGHT_BODY = `# Why your mind gets loud at night

It’s late, the house is quiet, and your mind picks this moment to replay a conversation from three years ago. If that sounds familiar, you’re in good company.

## Why the night makes it louder

In the day, your attention is spread over a hundred small things. At night they fall away, and whatever was waiting in the background gets the whole stage.

Being tired also makes it harder to step back from a thought. Worries feel bigger and more certain than they would at noon.

> [!TIP]
> A thought at 2am isn’t truer than the same thought at 2pm. It’s only louder.

## What tends to help

- Write the thought down, with one line on what you’ll do about it tomorrow. Then close the notebook.
- If you’ve been awake a while, get up. Read something dull in low light, and go back when you feel sleepy.
- Keep your phone out of reach. Scrolling feels like rest, but it keeps your mind switched on.

## When it’s more than a bad night

If nights like this come most weeks, or your thoughts turn to hurting yourself, talk to someone. A doctor or a helpline can help, and you don’t need to have it worked out first.
`;

const WINTER_BODY = `The first cold morning after Mum died, I found her scarf in my coat pocket. I don’t remember putting it there.

Everyone said the first year is the hardest. Nobody said which parts. For me it was the small, ordinary ones: the second cup I still made, the shop that still sold her biscuits.

## What helped, a little

I stopped waiting to feel normal again. I let some days be bad days. I told one friend the truth when she asked how I was, and she didn’t try to fix it.

It’s still winter some days. But I wear the scarf now.
`;

const FINE_BODY = `In my first term, everyone seemed to have found their people by week two. I hadn’t, and I was sure it showed.

What I didn’t know then was how many of them felt the same. We were all busy looking fine.

If you’re there now, say yes to one small thing this week. A study group, a walk, a second coffee with someone from your course. It doesn’t have to go well. It just has to happen.
`;

const OGL =
	"Contains public sector information licensed under the Open Government Licence v3.0.";

const NHS = {
	attributionText: OGL,
	author: undefined,
	licence: "OGL-3.0",
	logoUrl: undefined,
	name: "NHS",
	retrievedAt: undefined,
	url: "https://www.nhs.uk",
};

function read(
	slug: EntrySlug,
	extra: Partial<ReaderEntry> & Pick<ReaderEntry, "markdown" | "reuse">
): ReaderEntry {
	return {
		...card(slug),
		active: true,
		contentNote: undefined,
		facets: [],
		publishedAt: undefined,
		reflectPrompt: undefined,
		sources: [],
		storyDescriptor: undefined,
		...extra,
	};
}

export const NIGHT: ReaderEntry = read("thoughts-at-night", {
	markdown: NIGHT_BODY,
	reflectPrompt: "Which thought comes back most at night?",
	reuse: "adapted",
	sources: [
		{
			...NHS,
			pageTitle: "Insomnia",
			pageUrl: "https://www.nhs.uk/conditions/insomnia/",
		},
		{
			...NHS,
			name: "NHS Every Mind Matters",
			pageTitle: "How to fall asleep faster and sleep better",
			pageUrl:
				"https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/",
		},
	],
});

export const MANY_SOURCES: ReaderEntry["sources"] = [1, 2, 3].flatMap((n) =>
	NIGHT.sources.map((s) => ({ ...s, pageTitle: `${s.pageTitle} (${n})` }))
);

export const WINTER: ReaderEntry = read("winter", {
	contentNote: "Talks about the death of a parent.",
	markdown: WINTER_BODY,
	reuse: "original",
	storyDescriptor: "A daughter’s story",
});

export const FINE: ReaderEntry = read("fine", {
	markdown: FINE_BODY,
	reuse: "verbatim",
	sources: [
		{
			attributionText: "© [Publisher]. Shared under its licence.",
			author: "Ama O.",
			licence: "publisher",
			logoUrl: undefined,
			name: "[Publisher]",
			pageTitle: "When everyone else seems fine",
			pageUrl: undefined,
			retrievedAt: undefined,
			url: undefined,
		},
	],
	storyDescriptor: "In their own words",
});

export const TRANSCRIPT = NIGHT_BODY.replace(/^#.*\n+/gm, "")
	.replace(/^> \[!TIP\]\n/m, "")
	.replace(/^[>-] /gm, "");
