/**
 * Browse search's Need someone now? row (#552, CONTEXT.md "Browse search"): a
 * short curated list, matched on whole words. No model call, and the query is
 * never stored or logged. Terms are lowercase words; punctuation in a query is
 * a space, so "self-harm" and "suicide?" both match.
 */
const CRISIS_TERMS = [
	"suicide",
	"suicidal",
	"kms",
	"kill myself",
	"killing myself",
	"end my life",
	"ending my life",
	"end it all",
	"want to die",
	"wanna die",
	"self harm",
	"selfharm",
	"hurt myself",
	"hurting myself",
	"cut myself",
	"cutting myself",
	"overdose",
	"no reason to live",
	"better off dead",
];

export const isCrisisQuery = (text: string) => {
	const padded = ` ${text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()} `;
	return CRISIS_TERMS.some((term) => padded.includes(` ${term} `));
};
