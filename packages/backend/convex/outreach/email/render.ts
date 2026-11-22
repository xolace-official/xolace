"use node";

import { render } from "@react-email/render";
import { v } from "convex/values";
import { createElement, type ReactElement } from "react";
import { internalAction } from "../../_generated/server";
import { type EmailTemplate, emailTemplateValidator } from "../validators";
import { WelcomeEmail } from "./welcome";
import { welcomeLinks } from "./welcomeCopy";

/**
 * React Email templates rendered to HTML (#914), in Node, where React's
 * server renderer is at home. Called by the email adapter's `send`.
 */

/** Each template, built with this deployment's links. */
const TEMPLATES: Record<EmailTemplate, () => ReactElement> = {
	welcome: () => createElement(WelcomeEmail, { links: welcomeLinks() }),
};

export const renderEmail = internalAction({
	args: { template: emailTemplateValidator },
	handler: async (_ctx, { template }) => await render(TEMPLATES[template]()),
	returns: v.string(),
});
