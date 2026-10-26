// Generated from packages/backend/scripts/library/prod (manifest, sources, audio) for the
// admin v1 UI. Statuses marked in DEMO of the generator are invented so every badge
// and publish gate shows up; prod has all 20 entries live. Replaced by Convex reads.
import type { LibraryEntry, LibraryHub, LibrarySource } from "./types";

export const FIXTURE_SOURCES: LibrarySource[] = [
	{
		attributionText:
			"Adapted in part from guidance by Student Minds (studentminds.org.uk).",
		dropBrandingIfAdapted: true,
		licence: "© Student Minds; adapted in our own words, not reproduced",
		name: "Student Minds",
		permission: "not_required",
		slug: "student-minds",
		url: "https://www.studentminds.org.uk",
	},
	{
		attributionText:
			"Holley, Varga, Boorman and Fox (2024), Computational Psychiatry (CC BY 4.0). Findings summarised in our own words.",
		dropBrandingIfAdapted: true,
		licence: "CC BY 4.0",
		name: "Computational Psychiatry (Ubiquity Press)",
		permission: "not_required",
		slug: "computational-psychiatry",
		url: "https://cpsyjournal.org",
	},
	{
		attributionText:
			"Findings summarised from Kappes & Oettingen (2011), Journal of Experimental Social Psychology.",
		dropBrandingIfAdapted: true,
		licence: "© Elsevier; findings paraphrased, not reproduced",
		name: "Journal of Experimental Social Psychology (Elsevier)",
		permission: "not_required",
		slug: "elsevier",
		url: "https://www.sciencedirect.com/journal/journal-of-experimental-social-psychology",
	},
	{
		attributionText:
			"Findings summarised, in our own words, from open-access articles in Frontiers in Psychology (CC BY).",
		dropBrandingIfAdapted: true,
		licence:
			"CC BY (open-access Frontiers in Psychology articles); findings paraphrased",
		name: "Frontiers in Psychology",
		permission: "not_required",
		slug: "frontiers",
		url: "https://www.frontiersin.org/journals/psychology",
	},
	{
		attributionText: "Adapted from advice by the Mental Health Foundation.",
		dropBrandingIfAdapted: true,
		licence:
			"© Mental Health Foundation; advice paraphrased, not reproduced (no reuse licence found)",
		name: "Mental Health Foundation",
		permission: "not_required",
		slug: "mental-health-foundation",
		url: "https://www.mentalhealth.org.uk",
	},
	{
		attributionText:
			"Findings from de Berker et al. (2016), Nature Communications, paraphrased.",
		dropBrandingIfAdapted: true,
		licence: "© Springer Nature; findings paraphrased, not reproduced",
		name: "Nature Communications (Springer Nature)",
		permission: "not_required",
		slug: "nature-communications",
		url: "https://www.nature.com/ncomms/",
	},
	{
		attributionText:
			"Adapted from Newcastle University disability support pages.",
		dropBrandingIfAdapted: true,
		licence: "© Newcastle University; findings paraphrased, not reproduced",
		name: "Newcastle University",
		permission: "not_required",
		slug: "newcastle-university",
		url: "https://www.ncl.ac.uk",
	},
	{
		attributionText:
			"Contains public sector information licensed under the Open Government Licence v3.0",
		dropBrandingIfAdapted: true,
		licence: "Open Government Licence v3.0",
		name: "NHS",
		permission: "not_required",
		// DEMO: NHS pages refresh weekly (schema example), so its credits show as stale.
		refreshDays: 7,
		slug: "nhs",
		url: "https://www.nhs.uk",
	},
	{
		attributionText:
			"Bravata et al., Journal of General Internal Medicine (CC BY 4.0). Findings summarised in our own words.",
		dropBrandingIfAdapted: true,
		licence: "CC BY 4.0",
		name: "Journal of General Internal Medicine (Springer Nature)",
		permission: "not_required",
		slug: "springer",
		url: "https://link.springer.com/journal/11606",
	},
	{
		attributionText:
			"Information adapted from University of Greenwich library guides.",
		dropBrandingIfAdapted: true,
		licence:
			"© University of Greenwich; information paraphrased, not reproduced",
		name: "University of Greenwich",
		permission: "not_required",
		slug: "university-of-greenwich",
		url: "https://www.gre.ac.uk",
	},
	{
		attributionText:
			"Adapted from University of Salford web pages and the Salford Pedagogy journal.",
		dropBrandingIfAdapted: true,
		licence: "© University of Salford; findings paraphrased, not reproduced",
		name: "University of Salford",
		permission: "not_required",
		slug: "university-of-salford",
		url: "https://www.salford.ac.uk",
	},
	{
		attributionText:
			"Adapted from University of Southampton student support pages.",
		dropBrandingIfAdapted: true,
		licence:
			"© University of Southampton; findings paraphrased, not reproduced",
		name: "University of Southampton",
		permission: "not_required",
		slug: "university-of-southampton",
		url: "https://www.southampton.ac.uk",
	},
	{
		attributionText:
			"Findings summarised from Dai, Milkman & Riis (2014), Management Science.",
		dropBrandingIfAdapted: true,
		licence: "© INFORMS; findings paraphrased, not reproduced",
		name: "Management Science (INFORMS)",
		// DEMO: permission still being asked for.
		permission: "pending",
		slug: "informs",
		url: "https://pubsonline.informs.org/journal/mnsc",
	},
	{
		attributionText:
			"Findings summarised from Lally et al. (2010), European Journal of Social Psychology.",
		dropBrandingIfAdapted: true,
		licence: "© authors / Wiley; findings paraphrased, not reproduced",
		name: "University of Surrey Open Research (European Journal of Social Psychology)",
		permission: "not_required",
		slug: "university-of-surrey",
		url: "https://openresearch.surrey.ac.uk",
	},
	{
		attributionText: "Adapted from information by Mind (mind.org.uk).",
		dropBrandingIfAdapted: true,
		licence:
			"© Mind; advice paraphrased, not reproduced (no reuse licence checked)",
		name: "Mind",
		permission: "not_required",
		slug: "mind",
		url: "https://www.mind.org.uk",
	},
	{
		attributionText:
			"Adapted from guidance by the American Psychological Association (apa.org).",
		dropBrandingIfAdapted: true,
		licence:
			"© American Psychological Association; advice paraphrased, not reproduced (no reuse licence checked)",
		name: "American Psychological Association",
		permission: "not_required",
		slug: "american-psychological-association",
		url: "https://www.apa.org",
	},
	{
		attributionText:
			"Adapted from information by the World Health Organization (who.int).",
		dropBrandingIfAdapted: true,
		licence:
			"© World Health Organization; advice paraphrased, not reproduced (no reuse licence checked)",
		name: "World Health Organization",
		permission: "not_required",
		slug: "world-health-organization",
		url: "https://www.who.int",
	},
	{
		attributionText:
			"Adapted from information by the National Institute of Mental Health (nimh.nih.gov).",
		dropBrandingIfAdapted: true,
		licence:
			"© NIMH / US National Institutes of Health; advice paraphrased, not reproduced (no reuse licence checked)",
		name: "National Institute of Mental Health",
		permission: "not_required",
		slug: "national-institute-of-mental-health",
		url: "https://www.nimh.nih.gov",
	},
	{
		attributionText: "Shared with Xolace, with permission",
		dropBrandingIfAdapted: false,
		licence: "Xolace original",
		name: "Xolace",
		permission: "not_required",
		slug: "xolace",
	},
];

export const FIXTURE_ENTRIES: LibraryEntry[] = [
	{
		active: true,
		credits: [
			{
				pageTitle: "Why uncertainty can be stressful",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/why-uncertainty-can-be-stressful/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				author:
					"de Berker, Rutledge, Mathys, Marshall, Cross, Dolan and Bestmann",
				pageTitle:
					"Computations of uncertainty mediate acute stress responses in humans",
				pageUrl: "https://www.nature.com/articles/ncomms10996",
				retrievedAt: 1_790_812_800_000,
				source: "nature-communications",
			},
			{
				author: "Holley, Varga, Boorman and Fox",
				pageTitle:
					"Temporal Dynamics of Uncertainty Cause Anxiety and Avoidance",
				pageUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11192096/",
				retrievedAt: 1_790_812_800_000,
				source: "computational-psychiatry",
			},
			{
				author: "Lauriola et al.",
				pageTitle:
					"The Intolerance of Uncertainty Inventory: Validity and Comparison of Scoring Methods to Assess Individuals Screening Positive for Anxiety and Depression",
				pageUrl:
					"https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00388/full",
				retrievedAt: 1_790_812_800_000,
				source: "frontiers",
			},
			{
				pageTitle: "Anxiety (Every Mind Matters)",
				pageUrl:
					"https://www.nhs.uk/every-mind-matters/mental-health-issues/anxiety/",
				retrievedAt: 1_790_812_800_000,
				source: "nhs",
			},
			{
				pageTitle: "Tips to reduce stress",
				pageUrl:
					"https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/tips-to-reduce-stress/",
				retrievedAt: 1_790_812_800_000,
				source: "nhs",
			},
		],
		dek: "Why uncertainty puts the body on alert, why a long wait is draining, and what helps before you start university.",
		facets: {
			audience: ["student"],
			emotion: ["uncertainty", "stress", "anxiety"],
			lifeArea: ["change", "future", "settling-in"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_790_812_800_000,
		primarySubject: "starting-university",
		publishedAt: 1_790_812_800_000,
		readMin: 4,
		reflectPrompt: "What are you most unsure about right now?",
		retrievedAt: 1_790_812_800_000,
		reuse: "adapted",
		safetyReviewedAt: 1_790_899_200_000,
		slug: "not-knowing-feels-so-stressful-why",
		status: "live",
		title: "Not knowing feels so stressful, why?",
		updatedAt: 1_790_812_800_000,
	},
	{
		active: true,
		credits: [
			{
				pageTitle: "Managing expectations of university",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/managing-expectations-of-university/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				author: "Stefanie Hassel and Nathan Ridout",
				pageTitle:
					"An Investigation of First-Year Students' and Lecturers' Expectations of University Education",
				pageUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5790796/",
				retrievedAt: 1_790_812_800_000,
				source: "frontiers",
			},
			{
				author: "Gabriele Oettingen and Bettina Schwörer",
				pageTitle:
					"Mind wandering via mental contrasting as a tool for behavior change",
				pageUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3759023/",
				retrievedAt: 1_790_812_800_000,
				source: "frontiers",
			},
			{
				author: "Heather Barry Kappes and Gabriele Oettingen",
				pageTitle: "Positive fantasies about idealized futures sap energy",
				pageUrl: "https://researchonline.lse.ac.uk/id/eprint/46284/",
				retrievedAt: 1_790_812_800_000,
				source: "elsevier",
			},
			{
				pageTitle: "University and mental health: tips for students",
				pageUrl:
					"https://www.mentalhealth.org.uk/our-work/public-engagement/behind-books/tips-students",
				retrievedAt: 1_790_812_800_000,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Anxiety (Every Mind Matters)",
				pageUrl:
					"https://www.nhs.uk/every-mind-matters/mental-health-issues/anxiety/",
				retrievedAt: 1_790_812_800_000,
				source: "nhs",
			},
		],
		dek: "Imagining university in advance is normal; here is how to keep the picture flexible, and how to find out what it is really like.",
		facets: {
			audience: ["student"],
			emotion: ["uncertainty", "anxiety", "hope", "disappointment"],
			lifeArea: ["change", "settling-in", "future"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_790_812_800_000,
		primarySubject: "starting-university",
		publishedAt: 1_790_812_800_000,
		readMin: 4,
		reflectPrompt:
			"What does the ordinary version of your first week look like?",
		retrievedAt: 1_790_812_800_000,
		reuse: "adapted",
		slug: "setting-expectations-you-can-adjust",
		status: "live",
		title: "Setting expectations you can adjust",
		updatedAt: 1_790_902_800_000,
	},
	{
		active: true,
		credits: [
			{
				pageTitle: "Will I be good enough for the next academic level?",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/will-i-be-good-enough-for-the-next-academic-level/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				author: "Franziska Pfitzner-Eden",
				pageTitle:
					"Why Do I Feel More Confident? Bandura's Sources Predict Preservice Teachers' Latent Changes in Teacher Self-Efficacy",
				pageUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5070217/",
				retrievedAt: 1_790_812_800_000,
				source: "frontiers",
			},
			{
				author: "Bravata DM, Watts SA, Keefer AL, et al.",
				pageTitle:
					"Prevalence, Predictors, and Treatment of Impostor Syndrome: a Systematic Review",
				pageUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7174434/",
				retrievedAt: 1_790_812_800_000,
				source: "springer",
			},
			{
				pageTitle: "Reframing unhelpful thoughts",
				pageUrl:
					"https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/reframing-unhelpful-thoughts/",
				retrievedAt: 1_790_812_800_000,
				source: "nhs",
			},
			{
				pageTitle: "Get Academic Support",
				pageUrl: "https://libguides.gre.ac.uk/academicskills/support",
				retrievedAt: 1_790_812_800_000,
				source: "university-of-greenwich",
			},
		],
		dek: "Doubting your academic ability before you start is common, and there are small ways to test it before term begins.",
		facets: {
			audience: ["student"],
			emotion: ["self-doubt", "anxiety"],
			lifeArea: ["studies", "achievement", "self-worth"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_790_812_800_000,
		primarySubject: "starting-university",
		publishedAt: 1_790_812_800_000,
		readMin: 4,
		reflectPrompt: "What evidence do you already have that you can do this?",
		retrievedAt: 1_790_812_800_000,
		reuse: "adapted",
		slug: "am-i-good-enough-for-this",
		status: "live",
		title: '"Am I good enough for this?"',
		updatedAt: 1_790_992_800_000,
	},
	{
		active: true,
		credits: [
			{
				pageTitle: "What to expect from university staff",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/what-to-expect-from-university-staff/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				pageTitle: "Prepare for people using different language",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/prepare-for-people-using-different-language/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				author: "Helen Whitehead",
				pageTitle: "Hidden Curriculum in Higher Education",
				pageUrl:
					"https://openjournals.salford.ac.uk/pedagogy/article/id/276/print/",
				retrievedAt: 1_790_812_800_000,
				source: "university-of-salford",
			},
			{
				pageTitle: "Glossary for new students",
				pageUrl:
					"https://www.salford.ac.uk/welcome/on-campus/checklist-for-new-students/glossary-for-new-students",
				retrievedAt: 1_790_812_800_000,
				source: "university-of-salford",
			},
			{
				pageTitle: "Support and wellbeing",
				pageUrl:
					"https://www.southampton.ac.uk/studentservices/support-wellbeing.page",
				retrievedAt: 1_790_812_800_000,
				source: "university-of-southampton",
			},
			{
				pageTitle: "Disability Support",
				pageUrl: "https://www.ncl.ac.uk/wellbeing/disability-support/",
				retrievedAt: 1_790_812_800_000,
				source: "newcastle-university",
			},
		],
		dek: "Universities have their own vocabulary and their own kinds of staff; here's how to read both, and why not knowing yet isn't a sign you don't belong.",
		facets: {
			audience: ["student"],
			emotion: ["not-belonging", "embarrassment", "uncertainty"],
			lifeArea: ["belonging", "settling-in", "studies"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_790_812_800_000,
		primarySubject: "starting-university",
		publishedAt: 1_790_812_800_000,
		readMin: 5,
		reflectPrompt:
			"Which word or role at university are you most unsure about?",
		retrievedAt: 1_790_812_800_000,
		reuse: "adapted",
		slug: "decoding-the-place-words-and-people",
		status: "live",
		title: "Decoding the place: the words and the people",
		updatedAt: 1_791_082_800_000,
	},
	{
		active: true,
		credits: [
			{
				pageTitle: "Preparing to go back to university",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/preparing-to-go-back-to-university/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				pageTitle: "Returning to university",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/returning-to-university/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				author: "Hengchen Dai, Katherine L. Milkman and Jason Riis",
				pageTitle:
					"The Fresh Start Effect: Temporal Landmarks Motivate Aspirational Behavior",
				pageUrl:
					"https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf",
				retrievedAt: 1_790_812_800_000,
				source: "informs",
			},
			{
				author:
					"Phillippa Lally, Cornelia H. M. van Jaarsveld, Henry W. W. Potts and Jane Wardle",
				pageTitle:
					"How are habits formed: Modelling habit formation in the real world",
				pageUrl:
					"https://openresearch.surrey.ac.uk/esploro/outputs/99783513802346",
				retrievedAt: 1_790_812_800_000,
				source: "university-of-surrey",
			},
		],
		dek: "A short look back at last year, a gentle way back into your subject, and a few practical things worth sorting before term starts.",
		facets: {
			audience: ["student"],
			emotion: ["uncertainty", "stress", "hope"],
			lifeArea: ["studies", "finances", "housing", "change"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_790_812_800_000,
		primarySubject: "returning-to-university",
		publishedAt: 1_790_812_800_000,
		readMin: 4,
		reflectPrompt:
			"What is one thing from last year you'd like to repeat, and one you'd like to leave behind?",
		retrievedAt: 1_790_812_800_000,
		reuse: "adapted",
		slug: "picking-up-where-you-left-off",
		status: "live",
		title: "Picking up where you left off",
		updatedAt: 1_791_172_800_000,
	},
	{
		active: false,
		credits: [
			{
				pageTitle:
					"Why your social life might change as you progress into the next academic year",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/why-your-social-life-might-change-as-you-progress-into-the-next-academic-year/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				pageTitle: "Returning to university",
				pageUrl:
					"https://www.studentminds.org.uk/advice-and-info/returning-to-university/",
				retrievedAt: 1_790_812_800_000,
				source: "student-minds",
			},
			{
				pageTitle: "Get help with loneliness",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/feeling-lonely/",
				retrievedAt: 1_790_812_800_000,
				source: "nhs",
			},
		],
		dek: "Why friendships and routines shift between years at university, why that feels unsettling, and what helps.",
		facets: {
			audience: ["student"],
			emotion: ["loneliness", "uncertainty", "not-belonging"],
			lifeArea: ["friendships", "change", "belonging", "isolation"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_790_812_800_000,
		primarySubject: "returning-to-university",
		readMin: 4,
		reflectPrompt:
			"Who are you hoping to see this term, and what would make it easy to arrange?",
		retrievedAt: 1_790_812_800_000,
		reuse: "adapted",
		slug: "why-this-years-social-life-feels-different",
		status: "needs_review",
		title: "Why this year's social life feels different",
		updatedAt: 1_791_244_800_000,
	},
	{
		active: true,
		contentNote:
			"Mentions panic, racing thoughts and physical symptoms such as a fast heartbeat. Nothing graphic.",
		credits: [
			{
				pageTitle: "Anxiety",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/anxiety",
				retrievedAt: 1_791_359_721_872,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Anxiety, fear and panic",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anxiety-fear-panic/",
				retrievedAt: 1_791_359_721_872,
				source: "nhs",
			},
			{
				pageTitle: "Understanding anxiety",
				pageUrl:
					"https://www.mind.org.uk/information-support/types-of-mental-health-problems/anxiety-problems/understanding-anxiety/",
				retrievedAt: 1_791_359_721_872,
				source: "mind",
			},
			{
				pageTitle: "Anxiety",
				pageUrl: "https://www.apa.org/topics/anxiety",
				retrievedAt: 1_791_359_721_872,
				source: "american-psychological-association",
			},
			{
				pageTitle: "How psychologists help with anxiety disorders",
				pageUrl: "https://www.apa.org/topics/anxiety-disorders",
				retrievedAt: 1_791_359_721_872,
				source: "american-psychological-association",
			},
		],
		dek: "What anxiety is, how it shows up in your mind and body, why it happens, and when ordinary worry starts to be too much.",
		facets: {
			emotion: ["anxiety", "fear", "stress"],
			lifeArea: ["health", "sleep"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_791_359_721_872,
		narration: { durationSec: 462, hasTranscript: true, status: "live" },
		primarySubject: "anxiety",
		publishedAt: 1_791_359_721_872,
		readMin: 3,
		reflectPrompt:
			"When does your mind feel loudest, and what is your body doing then?",
		retrievedAt: 1_791_359_721_872,
		reuse: "adapted",
		safetyReviewedAt: 1_791_446_121_872,
		slug: "anxiety-what-it-is-and-why-it-happens",
		status: "live",
		title: "Anxiety: what it is and why it happens",
		updatedAt: 1_791_334_800_000,
	},
	{
		active: true,
		contentNote:
			"Mentions panic, sleep trouble and relying on alcohol or other substances to cope. Nothing graphic.",
		credits: [
			{
				pageTitle: "Anxiety",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/anxiety",
				retrievedAt: 1_791_359_721_872,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Anxiety, fear and panic",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anxiety-fear-panic/",
				retrievedAt: 1_791_359_721_872,
				source: "nhs",
			},
			{
				pageTitle: "Understanding anxiety",
				pageUrl:
					"https://www.mind.org.uk/information-support/types-of-mental-health-problems/anxiety-problems/understanding-anxiety/",
				retrievedAt: 1_791_359_721_872,
				source: "mind",
			},
			{
				pageTitle: "Anxiety",
				pageUrl: "https://www.apa.org/topics/anxiety",
				retrievedAt: 1_791_359_721_872,
				source: "american-psychological-association",
			},
			{
				pageTitle: "How psychologists help with anxiety disorders",
				pageUrl: "https://www.apa.org/topics/anxiety-disorders",
				retrievedAt: 1_791_359_721_872,
				source: "american-psychological-association",
			},
		],
		dek: "How anxiety shapes everyday life, five small things that can help when it feels overwhelming, and when to reach out for support.",
		facets: {
			emotion: ["anxiety", "overwhelm", "stress"],
			lifeArea: ["health", "studies", "work"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_791_359_721_872,
		narration: { durationSec: 499, hasTranscript: true, status: "processing" },
		primarySubject: "anxiety",
		publishedAt: 1_791_359_721_872,
		readMin: 3,
		reflectPrompt: "What is one small next step you could take today?",
		retrievedAt: 1_791_359_721_872,
		reuse: "adapted",
		slug: "anxiety-what-helps",
		status: "live",
		title: "Anxiety: what helps",
		updatedAt: 1_791_424_800_000,
	},
	{
		active: false,
		contentNote:
			"Mentions isolation, low mood and depression. Nothing graphic.",
		credits: [
			{
				pageTitle: "Loneliness",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/loneliness",
				retrievedAt: 1_791_364_428_236,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Every Mind Matters: Loneliness",
				pageUrl:
					"https://www.nhs.uk/every-mind-matters/lifes-challenges/loneliness/",
				retrievedAt: 1_791_364_428_236,
				source: "nhs",
			},
			{
				pageTitle: "Feeling lonely",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/feeling-lonely/",
				retrievedAt: 1_791_364_428_236,
				source: "nhs",
			},
			{
				pageTitle: "About loneliness",
				pageUrl:
					"https://www.mind.org.uk/information-support/tips-for-everyday-living/loneliness/about-loneliness/",
				retrievedAt: 1_791_364_428_236,
				source: "mind",
			},
		],
		dek: "Why you can feel alone in a crowd, what loneliness looks like, why it happens, and how it can quietly feed itself.",
		facets: {
			emotion: ["loneliness", "not-belonging", "anxiety"],
			lifeArea: ["isolation", "friendships", "belonging"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_791_364_428_236,
		primarySubject: "loneliness",
		readMin: 3,
		reflectPrompt: "When did you last feel truly understood by someone?",
		retrievedAt: 1_791_364_428_236,
		reuse: "adapted",
		slug: "loneliness-what-it-is",
		status: "processing",
		title: "Loneliness: what it is",
		updatedAt: 1_791_514_800_000,
	},
	{
		active: true,
		contentNote:
			"Mentions hopelessness and thoughts of self-harm as signs to seek professional support. Nothing graphic.",
		credits: [
			{
				pageTitle: "Loneliness",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/loneliness",
				retrievedAt: 1_791_364_428_236,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Every Mind Matters: Loneliness",
				pageUrl:
					"https://www.nhs.uk/every-mind-matters/lifes-challenges/loneliness/",
				retrievedAt: 1_791_364_428_236,
				source: "nhs",
			},
			{
				pageTitle: "Feeling lonely",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/feeling-lonely/",
				retrievedAt: 1_791_364_428_236,
				source: "nhs",
			},
			{
				pageTitle: "About loneliness",
				pageUrl:
					"https://www.mind.org.uk/information-support/tips-for-everyday-living/loneliness/about-loneliness/",
				retrievedAt: 1_791_364_428_236,
				source: "mind",
			},
		],
		dek: "Small, low-pressure ways to rebuild connection, and when loneliness is a sign to reach out for more support.",
		facets: {
			emotion: ["loneliness", "hope"],
			lifeArea: ["isolation", "friendships", "belonging"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_791_364_428_236,
		primarySubject: "loneliness",
		publishedAt: 1_791_364_428_236,
		readMin: 2,
		reflectPrompt: "Who is one person you could send a small message to today?",
		retrievedAt: 1_791_364_428_236,
		reuse: "adapted",
		slug: "loneliness-what-helps",
		status: "live",
		title: "Loneliness: what helps",
		updatedAt: 1_790_827_200_000,
	},
	{
		active: true,
		contentNote:
			"Mentions hopelessness, worthlessness and thoughts of suicide as possible symptoms. Nothing graphic.",
		credits: [
			{
				pageTitle: "Depression",
				pageUrl: "https://www.who.int/health-topics/depression/",
				retrievedAt: 1_791_368_976_066,
				source: "world-health-organization",
			},
			{
				pageTitle: "Depression",
				pageUrl: "https://www.nimh.nih.gov/health/topics/depression",
				retrievedAt: 1_791_368_976_066,
				source: "national-institute-of-mental-health",
			},
			{
				pageTitle: "Depression",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/depression",
				retrievedAt: 1_791_368_976_066,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Depression in adults",
				pageUrl:
					"https://www.nhs.uk/mental-health/conditions/depression-in-adults/",
				retrievedAt: 1_791_368_976_066,
				source: "nhs",
			},
			{
				pageTitle: "Depression",
				pageUrl:
					"https://www.mind.org.uk/information-support/types-of-mental-health-problems/depression/",
				retrievedAt: 1_791_368_976_066,
				source: "mind",
			},
		],
		dek: "How depression differs from a bad day, what it can feel like, why it happens, and how it can change the way you see yourself.",
		facets: {
			emotion: ["sadness", "hopelessness", "numbness"],
			lifeArea: ["health", "self-worth", "isolation"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_791_368_976_066,
		narration: {
			durationSec: 610,
			failure: {
				message:
					"ffmpeg exited with code 1: invalid data found when processing input",
				step: "Transcode narration",
			},
			hasTranscript: true,
			status: "failed",
		},
		primarySubject: "depression",
		publishedAt: 1_791_368_976_066,
		readMin: 3,
		reflectPrompt: "What has felt heavier than usual lately, and for how long?",
		retrievedAt: 1_791_368_976_066,
		reuse: "adapted",
		safetyReviewedAt: 1_791_455_376_066,
		slug: "depression-what-it-is",
		status: "live",
		title: "Depression: what it is",
		updatedAt: 1_790_899_200_000,
	},
	{
		active: true,
		contentNote:
			"Mentions hopelessness and thoughts of suicide or self-harm, with advice to seek urgent support. Nothing graphic.",
		credits: [
			{
				pageTitle: "Depression",
				pageUrl: "https://www.who.int/health-topics/depression/",
				retrievedAt: 1_791_368_976_066,
				source: "world-health-organization",
			},
			{
				pageTitle: "Depression",
				pageUrl: "https://www.nimh.nih.gov/health/topics/depression",
				retrievedAt: 1_791_368_976_066,
				source: "national-institute-of-mental-health",
			},
			{
				pageTitle: "Depression",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/depression",
				retrievedAt: 1_791_368_976_066,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Depression in adults",
				pageUrl:
					"https://www.nhs.uk/mental-health/conditions/depression-in-adults/",
				retrievedAt: 1_791_368_976_066,
				source: "nhs",
			},
			{
				pageTitle: "Depression",
				pageUrl:
					"https://www.mind.org.uk/information-support/types-of-mental-health-problems/depression/",
				retrievedAt: 1_791_368_976_066,
				source: "mind",
			},
		],
		dek: "Small, realistic first steps when you're struggling, what professional treatment can involve, and when to reach out for support.",
		facets: {
			emotion: ["hopelessness", "hope", "sadness"],
			lifeArea: ["health", "isolation", "self-worth"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_791_368_976_066,
		narration: { durationSec: 647, hasTranscript: true, status: "live" },
		primarySubject: "depression",
		publishedAt: 1_791_368_976_066,
		readMin: 2,
		reflectPrompt:
			"Who is one person you could tell, even in a few words, that you haven't been feeling like yourself?",
		retrievedAt: 1_791_368_976_066,
		reuse: "adapted",
		slug: "depression-what-helps",
		status: "live",
		title: "Depression: what helps",
		updatedAt: 1_790_989_200_000,
	},
	{
		active: true,
		contentNote:
			"Describes physical and emotional signs of stress, including sleep and appetite changes. Nothing graphic.",
		credits: [
			{
				pageTitle: "Stress",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/stress",
				retrievedAt: 1_791_368_976_066,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Stress",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/stress/",
				retrievedAt: 1_791_368_976_066,
				source: "nhs",
			},
			{
				pageTitle: "Stress",
				pageUrl:
					"https://www.who.int/news-room/questions-and-answers/item/stress",
				retrievedAt: 1_791_368_976_066,
				source: "world-health-organization",
			},
			{
				pageTitle: "Caring for Your Mental Health",
				pageUrl:
					"https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
				retrievedAt: 1_791_368_976_066,
				source: "national-institute-of-mental-health",
			},
		],
		dek: "How stress shows up in your body, thoughts and behaviour, what builds it, and how one pressure can feed the next.",
		facets: {
			emotion: ["stress", "overwhelm", "anxiety"],
			lifeArea: ["health", "work", "studies"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_791_368_976_066,
		primarySubject: "stress",
		publishedAt: 1_791_368_976_066,
		readMin: 2,
		reflectPrompt:
			"Where do you notice stress first: in your body, your thoughts, or how you treat people?",
		retrievedAt: 1_791_368_976_066,
		reuse: "adapted",
		safetyReviewedAt: 1_791_455_376_066,
		slug: "stress-what-it-is",
		status: "live",
		title: "Stress: what it is",
		updatedAt: 1_791_079_200_000,
	},
	{
		active: false,
		contentNote:
			"Mentions alcohol, smoking and drugs as coping habits that can backfire. Nothing graphic.",
		credits: [
			{
				pageTitle: "Stress",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/stress",
				retrievedAt: 1_791_368_976_066,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Stress",
				pageUrl:
					"https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/stress/",
				retrievedAt: 1_791_368_976_066,
				source: "nhs",
			},
			{
				pageTitle: "Stress",
				pageUrl:
					"https://www.who.int/news-room/questions-and-answers/item/stress",
				retrievedAt: 1_791_368_976_066,
				source: "world-health-organization",
			},
			{
				pageTitle: "Caring for Your Mental Health",
				pageUrl:
					"https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
				retrievedAt: 1_791_368_976_066,
				source: "national-institute-of-mental-health",
			},
		],
		dek: "Small ways to ease stress as it builds, how to tell when it's too much, and why being stressed isn't a personal failure.",
		facets: {
			emotion: ["stress", "overwhelm", "hope"],
			lifeArea: ["health", "work", "studies"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_791_368_976_066,
		primarySubject: "stress",
		publishedAt: 1_791_368_976_066,
		readMin: 2,
		reflectPrompt:
			"What is one thing on your list that could wait until tomorrow?",
		retrievedAt: 1_791_368_976_066,
		reuse: "adapted",
		slug: "stress-what-helps",
		status: "retired",
		title: "Stress: what helps",
		updatedAt: 1_791_169_200_000,
	},
	{
		active: true,
		contentNote:
			"Mentions anxiety, depression and substance use in connection with poor sleep. Nothing graphic.",
		credits: [
			{
				pageTitle: "Sleep and mental health",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/sleep-and-mental-health",
				retrievedAt: 1_791_368_976_066,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Insomnia",
				pageUrl: "https://www.nhs.uk/conditions/insomnia/",
				retrievedAt: 1_791_368_976_066,
				source: "nhs",
			},
			{
				pageTitle: "Caring for Your Mental Health",
				pageUrl:
					"https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
				retrievedAt: 1_791_368_976_066,
				source: "national-institute-of-mental-health",
			},
		],
		dek: "Why sleep and mental health affect each other, the cycle that keeps you awake, and the signs your sleep needs attention.",
		facets: {
			emotion: ["stress", "anxiety", "overwhelm"],
			lifeArea: ["sleep", "health", "studies"],
		},
		hasCover: true,
		kind: "explainer",
		lastReviewedAt: 1_791_368_976_066,
		primarySubject: "sleep",
		publishedAt: 1_791_368_976_066,
		readMin: 2,
		reflectPrompt: "What is your mind doing when your body is ready to sleep?",
		retrievedAt: 1_791_368_976_066,
		reuse: "adapted",
		safetyReviewedAt: 1_791_455_376_066,
		slug: "sleep-why-it-matters",
		status: "live",
		title: "Sleep: why it matters",
		updatedAt: 1_791_259_200_000,
	},
	{
		active: true,
		contentNote:
			"Mentions alcohol and medication used to sleep, with advice to seek professional help. Nothing graphic.",
		credits: [
			{
				pageTitle: "Sleep and mental health",
				pageUrl:
					"https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/sleep-and-mental-health",
				retrievedAt: 1_791_368_976_066,
				source: "mental-health-foundation",
			},
			{
				pageTitle: "Insomnia",
				pageUrl: "https://www.nhs.uk/conditions/insomnia/",
				retrievedAt: 1_791_368_976_066,
				source: "nhs",
			},
			{
				pageTitle: "Caring for Your Mental Health",
				pageUrl:
					"https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
				retrievedAt: 1_791_368_976_066,
				source: "national-institute-of-mental-health",
			},
		],
		dek: "Small changes to wind down, ease the worry about not sleeping, and when to talk to a professional.",
		facets: {
			emotion: ["stress", "overwhelm", "hope"],
			lifeArea: ["sleep", "health", "studies"],
		},
		hasCover: true,
		kind: "advice",
		lastReviewedAt: 1_791_368_976_066,
		primarySubject: "sleep",
		publishedAt: 1_791_368_976_066,
		readMin: 2,
		reflectPrompt:
			"What is one small thing you could do tonight to let the day end?",
		retrievedAt: 1_791_368_976_066,
		reuse: "adapted",
		slug: "sleep-what-helps",
		status: "live",
		title: "Sleep: what helps",
		updatedAt: 1_791_331_200_000,
	},
	{
		active: true,
		consentRecordedAt: 1_792_108_800_000,
		credits: [
			{
				author: "Andrews Nana Beniako",
				pageTitle:
					'Finding my "why": studying, building, and the people who push you higher',
				source: "xolace",
			},
		],
		dek: "He spent university keeping people at a distance. Building something with others is what finally connected him.",
		facets: {
			audience: ["student"],
			emotion: ["loneliness", "stress", "hope"],
			lifeArea: ["purpose", "studies", "friendships", "work"],
		},
		hasCover: true,
		kind: "story",
		lastReviewedAt: 1_792_108_800_000,
		narration: { durationSec: 412, hasTranscript: true, status: "live" },
		primarySubject: "starting-university",
		publishedAt: 1_792_108_800_000,
		readMin: 3,
		reflectPrompt:
			"What do you want this season of your life to be the foundation for?",
		reuse: "original",
		slug: "finding-my-why",
		status: "live",
		storyDescriptor: "Andrews Nana Beniako, Xolace CMO",
		title:
			'Finding my "why": studying, building, and the people who push you higher',
		updatedAt: 1_791_421_200_000,
	},
	{
		active: true,
		consentRecordedAt: 1_792_108_800_000,
		credits: [
			{
				author: "Nathaniel E. Adama",
				pageTitle: "Make or break: the friends who carried me to first class",
				source: "xolace",
			},
		],
		dek: "From nearly failing SHS to first class honours. He says the reason wasn't studying harder, but who he studied with.",
		facets: {
			audience: ["student"],
			emotion: ["fear", "self-doubt", "disappointment", "hope"],
			lifeArea: ["studies", "friendships", "achievement"],
		},
		hasCover: true,
		kind: "story",
		lastReviewedAt: 1_792_108_800_000,
		narration: { durationSec: 449, hasTranscript: true, status: "live" },
		primarySubject: "starting-university",
		publishedAt: 1_792_108_800_000,
		readMin: 4,
		reflectPrompt: "Who in your circle is strong where you're not?",
		reuse: "original",
		slug: "make-or-break-the-friends-who-carried-me",
		status: "live",
		storyDescriptor: "Nathaniel E. Adama, Xolace CEO",
		title: "Make or break: the friends who carried me to first class",
		updatedAt: 1_791_511_200_000,
	},
	{
		active: false,
		contentNote:
			"About the sudden death of a close friend and the grief that followed. Nothing graphic.",
		credits: [
			{
				author: "Emmanuel Acquah",
				pageTitle: "For Godwin, my best friend",
				source: "xolace",
			},
		],
		dek: "Losing his closest friend at a young age taught him what it means to carry something with nowhere to put it.",
		facets: {
			audience: ["student"],
			emotion: ["grief", "sadness", "loneliness"],
			lifeArea: ["loss", "friendships", "isolation"],
		},
		hasCover: true,
		kind: "story",
		lastReviewedAt: 1_792_108_800_000,
		narration: { durationSec: 486, hasTranscript: true, status: "live" },
		primarySubject: "grief",
		readMin: 6,
		reflectPrompt:
			"Is there someone you've lost that you haven't had the space to talk about?",
		reuse: "original",
		slug: "for-godwin-my-best-friend",
		status: "draft",
		storyDescriptor: "Emmanuel Acquah, Xolace COO",
		title: "For Godwin, my best friend",
		updatedAt: 1_790_823_600_000,
	},
	{
		active: true,
		consentRecordedAt: 1_792_108_800_000,
		credits: [
			{
				author: "Emmanuel Somuah",
				pageTitle: "What they don't put on the transcript",
				source: "xolace",
			},
		],
		dek: "Money gone in two months, a broken heart, and the day he cried at work. What finally changed was one honest message.",
		facets: {
			audience: ["student"],
			emotion: ["loneliness", "self-doubt", "hope"],
			lifeArea: ["studies", "finances", "work", "isolation"],
		},
		hasCover: true,
		kind: "story",
		lastReviewedAt: 1_792_108_800_000,
		narration: { durationSec: 523, hasTranscript: true, status: "live" },
		primarySubject: "loneliness",
		publishedAt: 1_792_108_800_000,
		readMin: 5,
		reflectPrompt: "What are you carrying that you haven't said out loud yet?",
		reuse: "original",
		slug: "what-they-dont-put-on-the-transcript",
		status: "live",
		storyDescriptor: "Emmanuel Somuah, Xolace CTO",
		title: "What they don't put on the transcript",
		updatedAt: 1_790_913_600_000,
	},
];

// From packages/backend/scripts/library/prod/hubs.json. The last hub is DEMO: a draft
// with no cover, mixing an entry and a support track, so the hub gates show up.
export const FIXTURE_HUBS: LibraryHub[] = [
	{
		active: true,
		hasCover: true,
		intro:
			"A short reading list for the weeks before university starts. It covers the nerves, the unknowns and the new language, so you can arrive a little steadier.",
		items: [
			{ kind: "entry", ref: "not-knowing-feels-so-stressful-why" },
			{ kind: "entry", ref: "setting-expectations-you-can-adjust" },
			{ kind: "entry", ref: "am-i-good-enough-for-this" },
			{ kind: "entry", ref: "decoding-the-place-words-and-people" },
		],
		slug: "before-you-arrive",
		status: "live",
		title: "Before you arrive",
		updatedAt: 1_790_812_800_000,
	},
	{
		active: true,
		hasCover: true,
		intro:
			"A short reading list for the days before a new term at a university you already know. It covers looking back at last year, easing back into your studies, and the friendships that may have changed over the break.",
		items: [
			{ kind: "entry", ref: "picking-up-where-you-left-off" },
			{ kind: "entry", ref: "why-this-years-social-life-feels-different" },
		],
		slug: "back-at-university",
		status: "live",
		title: "Back at university",
		updatedAt: 1_790_812_800_000,
	},
	{
		active: true,
		hasCover: true,
		intro:
			"A short reading list for the nights and weeks when your body is tired but your mind keeps running. It covers what stress does, why sleep and mood pull on each other, and small ways to ease both.",
		items: [
			{ kind: "entry", ref: "stress-what-it-is" },
			{ kind: "entry", ref: "sleep-why-it-matters" },
			{ kind: "entry", ref: "stress-what-helps" },
			{ kind: "entry", ref: "sleep-what-helps" },
		],
		slug: "when-you-cant-switch-off",
		status: "live",
		title: "When you can't switch off",
		updatedAt: 1_790_812_800_000,
	},
	{
		active: false,
		hasCover: false,
		intro: "",
		items: [
			{ kind: "entry", ref: "depression-what-it-is" },
			{ kind: "audio", ref: "support-depression-non-crisis-01" },
			{ kind: "entry", ref: "depression-what-helps" },
		],
		slug: "when-everything-feels-heavy",
		status: "draft",
		title: "When everything feels heavy",
		updatedAt: 1_791_244_800_000,
	},
];
