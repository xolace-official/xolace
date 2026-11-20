export const COPY = {
	actions: { call: "Call", email: "Email", open: "Open" },
	directory: {
		sub: "IASP's worldwide directory of crisis centres",
		title: "Find a crisis centre",
	},
	disclaimer:
		"Xolace Inc assumes no responsibility or liability for the professional ability, reputation, or quality of services provided by the entities or individuals listed above. Inclusion on this list does not constitute an endorsement by Xolace Inc. The order does not imply any ranking or evaluation. Xolace Inc cannot vouch for the contact information's accuracy;",
	elsewhere: "Somewhere else",
	elsewhereNote:
		"We don't have local lines for where you are yet. Your local emergency number still works, and the directory below lists crisis centres near you.",
	emergency: "EMERGENCY",
	emergencyHint: "Opens your phone dialer",
	emergencyLabel: (number: string) => `Call emergency services: ${number}`,
	lastUpdated: (date: string) => `Last updated: ${date}`,
	reportError: "Found an error? support@xolaceinc.com",
	reportErrorLabel: "Email support@xolaceinc.com to report an error",
	showing: "Showing resources for",
	sub: "If you need support right now, you're in the right place.",
	supportEmail: "support@xolaceinc.com",
	title: "Get help now",
	toast: {
		linkFailed: "Unable to open link.",
		noDialer: "Unable to open dialer. Please dial manually.",
		noMail: "No mail app found",
	},
} as const;
