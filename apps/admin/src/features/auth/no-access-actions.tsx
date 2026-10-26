"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@xolace/ui/components/button";
import { LogOutIcon } from "lucide-react";

import { SIGN_IN_PATH } from "./access";

/** Who is signed in, and a way out to try another account. */
export function NoAccessActions() {
	const { user } = useUser();
	const { signOut } = useClerk();
	const email = user?.primaryEmailAddress?.emailAddress;

	return (
		<div className="flex flex-col gap-4">
			{email ? (
				<p className="type-body text-ink-muted">
					Signed in as <span className="font-semibold text-ink">{email}</span>.
				</p>
			) : null}
			<Button
				className="w-full"
				onClick={() => signOut({ redirectUrl: SIGN_IN_PATH })}
				size="lg"
				variant="outline"
			>
				<LogOutIcon />
				Sign out
			</Button>
		</div>
	);
}
