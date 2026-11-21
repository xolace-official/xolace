"use node";

import { render } from "@react-email/render";
import { v } from "convex/values";
import { createElement, type FunctionComponent } from "react";
import { internalAction } from "../../_generated/server";
import { type EmailTemplate, emailTemplateValidator } from "../validators";
import { WelcomeEmail } from "./welcome";

/**
 * React Email templates rendered to HTML (#914), in Node, where React's
 * server renderer is at home. Called by the email adapter's `send`.
 */

const TEMPLATES: Record<EmailTemplate, FunctionComponent> = {
	welcome: WelcomeEmail,
};

export const renderEmail = internalAction({
	args: { template: emailTemplateValidator },
	handler: async (_ctx, { template }) =>
		await render(createElement(TEMPLATES[template])),
	returns: v.string(),
});
