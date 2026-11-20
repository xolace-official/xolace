export const FEEDBACK_COPY = {
	back: "Go back",
	menu: {
		bug: { hint: "Something broke or felt off", label: "Report a bug" },
		idea: { hint: "Something you'd love to see", label: "Suggest an idea" },
		title: "How can we help?",
		whatsNew: { hint: "See the latest updates", label: "What's new" },
	},
	report: {
		about: (name: string) => `About ${name}`,
		bug: {
			placeholder: "What happened? What did you expect instead?",
			rateLimited: "You've sent a lot of feedback today. Come back tomorrow.",
			sent: "We read every piece of feedback.",
			title: "Report a bug",
		},
		concern: {
			placeholder:
				"What happened? Anything you can tell us helps us look into it.",
			rateLimited:
				"You've reached today's report limit. If this is urgent, email support@xolaceinc.com and a human will pick it up.",
			sent: "A person on our team reads every report.",
			title: "Report a concern",
		},
		hint: "Up to 1000 characters",
		idea: {
			placeholder: "What would you love to see?",
			rateLimited: "You've sent a lot of feedback today. Come back tomorrow.",
			sent: "We read every piece of feedback.",
			title: "Suggest an idea",
		},
		send: "Send",
		sendConcern: "Send report",
		sendFeedback: "Send feedback",
		sending: "Sending...",
		somethingWrong: "Something went wrong",
		tabs: { bug: "Bug", idea: "Idea" },
		thanks: "Thank you.",
	},
	shakeHint: "Shake your phone anytime to send feedback.",
} as const;
