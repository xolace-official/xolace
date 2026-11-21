/** @jsxImportSource react */
// Pinned: clients that typecheck the backend (the CLI) use another JSX runtime.
"use node";

import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Text,
} from "@react-email/components";

/**
 * The welcome (#914): a placeholder, reviewed like code. The final copy, the
 * deep links and the crisis footer come with the sign-up trigger (#915).
 * Neutral by design: the subject and preview say nothing about mental
 * health, so a glance at an inbox gives nothing away.
 */
export function WelcomeEmail() {
	return (
		<Html lang="en">
			<Head />
			<Preview>Welcome to Xolace</Preview>
			<Body style={body}>
				<Container style={container}>
					<Text style={heading}>Welcome to Xolace</Text>
					<Text style={paragraph}>
						Xolace is a quiet place to put down what's on your mind.
					</Text>
					<Hr />
					<Text style={footer}>
						A person reads replies to this address, though not instantly.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}

const body = { backgroundColor: "#ffffff", fontFamily: "sans-serif" };
const container = { margin: "0 auto", maxWidth: "560px", padding: "24px" };
const heading = { fontSize: "20px", fontWeight: 600 };
const paragraph = { fontSize: "16px", lineHeight: "24px" };
const footer = { color: "#6b6b6b", fontSize: "13px" };
