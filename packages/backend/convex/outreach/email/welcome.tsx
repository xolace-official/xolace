/** @jsxImportSource react */
// Pinned: clients that typecheck the backend (the CLI) use another JSX runtime.
"use node";

import {
	Body,
	Container,
	Head,
	Html,
	Img,
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
 * shared with the plain-text part. The app's Default theme (light) and the
 * brand's gradient. System faces only: a web font would tell its host when
 * the email is opened. One image, the logo, served by this deployment, which
 * records nothing; every link goes through its redirect into the app.
 */
export function WelcomeEmail({ links }: { links: WelcomeLinks }) {
	return (
		<Html lang="en">
			<Head />
			<Preview>{WELCOME_PREVIEW}</Preview>
			<Body style={body}>
				<Container style={container}>
					<Section style={header}>
						<Img
							alt="Xolace"
							height={LOGO_HEIGHT}
							src={links.logo}
							width={LOGO_WIDTH}
						/>
					</Section>
					<Section style={card}>
						<Section style={cardInner}>
							<Section style={accentBar} />
							<Text style={heading}>{WELCOME_SUBJECT}</Text>
							<Text style={paragraph}>{WELCOME_INTRO}</Text>
							<Text style={label}>{WELCOME_START}</Text>
							{WELCOME_STARTS.map(({ label: text, target }) => (
								<Link href={links[target]} key={target} style={start}>
									{text}
									<span style={arrow}>&rarr;</span>
								</Link>
							))}
							<Text style={note}>{WELCOME_SETTINGS}</Text>
							<Text style={signOff}>{WELCOME_SIGN_OFF}</Text>
						</Section>
					</Section>
					<Section style={footerBox}>
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
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

/** The lockup's own proportions (428 × 160), shown at half its size. */
const LOGO_WIDTH = 150;
const LOGO_HEIGHT = 56;

// The Default theme, light (apps/mobile/src/design/themes.ts).
const BACKGROUND = "#f7f5fb";
const SURFACE = "#ffffff";
const INK = "#191524";
const BODY_INK = "#3a3448";
const MUTED = "#5d576e";
const ACCENT_INK = "#4b32c2";
const ACCENT_WASH = "#ece7ff";
const HAIRLINE = "rgba(25, 21, 36, 0.06)";
/** The wordmark's gradient, peach to cyan; a solid pink where unsupported. */
const BRAND_GRADIENT =
	"linear-gradient(90deg, #f6c08e 0%, #eeaecb 35%, #c9b2ea 70%, #84d8e1 100%)";

/** The reader's own system face, so nothing is fetched to draw the text. */
const FONT =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const body = { backgroundColor: BACKGROUND, color: INK, fontFamily: FONT };
const container = { margin: "0 auto", maxWidth: "560px", padding: "24px 16px" };
const header = { padding: "16px 8px 20px" };
const card = {
	backgroundColor: SURFACE,
	border: `1px solid ${HAIRLINE}`,
	borderRadius: "24px",
};
const cardInner = { padding: "32px 32px 12px" };
/** A short bar in the wordmark's gradient, over the heading. */
const accentBar = {
	backgroundColor: "#eeaecb",
	backgroundImage: BRAND_GRADIENT,
	borderRadius: "3px",
	height: "6px",
	lineHeight: "6px",
	margin: "0 0 20px",
	width: "56px",
};
const heading = {
	color: INK,
	fontFamily: FONT,
	fontSize: "28px",
	fontWeight: 700,
	letterSpacing: "-0.01em",
	lineHeight: "34px",
	margin: "0 0 16px",
};
const paragraph = {
	color: BODY_INK,
	fontSize: "16px",
	lineHeight: "26px",
	margin: "0 0 20px",
};
const label = {
	color: MUTED,
	fontSize: "14px",
	lineHeight: "20px",
	margin: "0 0 10px",
};
const start = {
	backgroundColor: ACCENT_WASH,
	borderRadius: "14px",
	color: ACCENT_INK,
	display: "block",
	fontSize: "16px",
	fontWeight: 600,
	lineHeight: "22px",
	marginBottom: "8px",
	padding: "14px 18px",
	textDecoration: "none",
};
const arrow = { float: "right" as const };
const note = {
	color: MUTED,
	fontSize: "14px",
	lineHeight: "22px",
	margin: "20px 0 16px",
};
const signOff = {
	color: INK,
	fontSize: "16px",
	fontWeight: 600,
	lineHeight: "24px",
	margin: "0 0 16px",
};
const footerBox = { padding: "20px 24px 8px" };
const footer = {
	color: MUTED,
	fontSize: "13px",
	lineHeight: "20px",
	margin: "0 0 12px",
};
const footerLink = { color: MUTED, textDecoration: "underline" };
