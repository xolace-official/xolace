import type { Metadata } from "next";
import { Suspense } from "react";

import {
	AuthFrame,
	AuthFrameArt,
	AuthFrameDescription,
	AuthFrameHeader,
	AuthFrameMain,
	AuthFrameTitle,
} from "@/features/auth/auth-frame";
import { redirectIfSignedIn } from "@/features/auth/guards";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign in · Xolace Admin" };

export default async function SignInPage() {
	await redirectIfSignedIn();

	return (
		<AuthFrame>
			<AuthFrameMain>
				<AuthFrameHeader>
					<AuthFrameTitle>Sign in</AuthFrameTitle>
					<AuthFrameDescription>
						Staff only. Use your Xolace work email.
					</AuthFrameDescription>
				</AuthFrameHeader>
				{/* SignInForm reads ?redirect_url. */}
				<Suspense>
					<SignInForm />
				</Suspense>
			</AuthFrameMain>
			<AuthFrameArt pose="wave" />
		</AuthFrame>
	);
}
