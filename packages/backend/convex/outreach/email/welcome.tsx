/** @jsxImportSource react */
// Pinned: clients that typecheck the backend (the CLI) use another JSX runtime.
"use node";

import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import {
	WELCOME_CRISIS,
	WELCOME_HELPLINES,
	WELCOME_INTRO,
	WELCOME_PREVIEW,
	WELCOME_REPLIES,
	WELCOME_SETTINGS,
	WELCOME_SIGN_OFF,
	WELCOME_START,
	WELCOME_STARTS,
	WELCOME_SUBJECT,
	WELCOME_SUPPORT,
	type WelcomeLinks,
} from "./welcomeCopy";

/**
 * The welcome (#915), reviewed like code. Its words live in `welcomeCopy`,
 * shared with the plain-text part. No images and no tracking: every link
 * goes through this deployment's redirect into the app, which records
 * nothing.
 */
export function WelcomeEmail({ links }: { links: WelcomeLinks }) {
	return (
		<Html lang="en">
			<Head />
			<Preview>{WELCOME_PREVIEW}</Preview>
			<Body style={body}>
				<Container style={container}>
					<Text style={heading}>{WELCOME_SUBJECT}</Text>
					<Text style={paragraph}>{WELCOME_INTRO}</Text>
					<Text style={paragraph}>{WELCOME_START}</Text>
					<Section>
						{WELCOME_STARTS.map(({ label, target }) => (
							<Text key={target} style={start}>
								<Link href={links[target]} style={link}>
									{label}
								</Link>
							</Text>
						))}
					</Section>
					<Text style={paragraph}>{WELCOME_SETTINGS}</Text>
					<Text style={paragraph}>{WELCOME_SIGN_OFF}</Text>
					<Hr style={rule} />
					<Text style={footer}>
						{WELCOME_CRISIS}{" "}
						<Link href={links.helplines} style={footerLink}>
							{WELCOME_HELPLINES}
						</Link>
						{" · "}
						<Link href={links.support} style={footerLink}>
							{WELCOME_SUPPORT}
						</Link>
					</Text>
					<Text style={footer}>{WELCOME_REPLIES}</Text>
				</Container>
			</Body>
		</Html>
	);
}

const INK = "#1f1f1f";
const MUTED = "#6b6b6b";
const PAPER = "#ffffff";
const RULE = "#e6e6e6";

const body = {
	backgroundColor: PAPER,
	color: INK,
	fontFamily: "sans-serif",
};
const container = { margin: "0 auto", maxWidth: "560px", padding: "24px" };
const heading = { fontSize: "20px", fontWeight: 600 };
const paragraph = { fontSize: "16px", lineHeight: "24px" };
const start = { fontSize: "16px", lineHeight: "24px", margin: "8px 0" };
const link = { color: INK, textDecoration: "underline" };
const rule = { borderColor: RULE, margin: "24px 0" };
const footer = { color: MUTED, fontSize: "13px", lineHeight: "20px" };
const footerLink = { color: MUTED, textDecoration: "underline" };
