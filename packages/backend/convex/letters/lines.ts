/**
 * What a sender is told when the check gives their letter back to fix (#750):
 * one gentle line per category, written by people and reviewed here. The
 * classifier only picks the category; it never writes words the sender sees,
 * because a model writing the sender's copy is the AI help #747 rules out.
 *
 * The order is the order of precedence when a letter has several: the first
 * one a sender can't send at all (contact, a link) before the ones about tone.
 */
export const FIXABLE_CATEGORIES = [
	"contact",
	"link",
	"identifying",
	"selling",
	"medical",
	"graphic",
	"preaching",
	"minimising",
	"forced_positivity",
	"off_topic",
] as const;

export type FixableCategory = (typeof FIXABLE_CATEGORIES)[number];

export const FIXABLE_LINES: Record<FixableCategory, string> = {
	contact:
		"Letters can’t carry contact details, so no one can be found through one. Could you take them out?",
	forced_positivity:
		"Someone reading this may not be ready to look on the bright side. Could you meet them where they are?",
	graphic:
		"Some of this is more detail than a stranger may be ready for. Could you say it more gently?",
	identifying:
		"Letters stay anonymous both ways. Could you take out the names and places that could point to someone?",
	link: "Letters can’t carry links. Could you take it out and say it in your own words?",
	medical:
		"Letters can’t give medical or medication advice. Could you share what helped you, rather than what someone should take?",
	minimising:
		"This might make someone feel their pain is small. Could you leave room for how hard it is?",
	off_topic:
		"A letter is a few kind words for someone who needs them. Could you write it to them?",
	preaching:
		"Faith can be part of your story, but a letter can’t urge it on someone. Could you keep it to what helped you?",
	selling:
		"Letters can’t sell or point someone to a paid service, group or program. Could you take that part out?",
};
