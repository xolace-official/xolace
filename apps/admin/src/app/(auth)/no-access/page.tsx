import type { Metadata } from "next";

import {
	AuthFrame,
	AuthFrameArt,
	AuthFrameDescription,
	AuthFrameHeader,
	AuthFrameMain,
	AuthFrameTitle,
} from "@/features/auth/auth-frame";
import { requireNonAdmin } from "@/features/auth/guards";
import { NoAccessActions } from "@/features/auth/no-access-actions";

export const metadata: Metadata = { title: "No access · Xolace Admin" };

export default async function NoAccessPage() {
	await requireNonAdmin();

	return (
		<AuthFrame>
			<AuthFrameMain>
				<AuthFrameHeader>
					<AuthFrameTitle>No admin access</AuthFrameTitle>
					<AuthFrameDescription>
						This account isn't an admin. Ask an engineer to grant access, then
						sign in again.
					</AuthFrameDescription>
				</AuthFrameHeader>
				<NoAccessActions />
			</AuthFrameMain>
			<AuthFrameArt pose="whisper" />
		</AuthFrame>
	);
}
