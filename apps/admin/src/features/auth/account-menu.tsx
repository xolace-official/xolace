"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xolace/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@xolace/ui/components/dropdown-menu";
import { LogOutIcon } from "lucide-react";

import { SIGN_IN_PATH } from "./access";

/** Top-bar avatar: who is signed in, and Sign out. */
export function AccountMenu() {
	const { user } = useUser();
	const { signOut } = useClerk();

	if (!user) {
		return null;
	}

	const name = user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Account"
				className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
			>
				<Avatar size="sm">
					<AvatarImage alt="" src={user.imageUrl} />
					<AvatarFallback name={name} />
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-auto min-w-56">
				{/* Plain text, not DropdownMenuLabel: that one is an uppercase eyebrow. */}
				<div className="flex flex-col px-2 py-2">
					{user.fullName ? (
						<span className="type-body font-semibold text-ink">
							{user.fullName}
						</span>
					) : null}
					<span className="type-small text-ink-muted">
						{user.primaryEmailAddress?.emailAddress}
					</span>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => signOut({ redirectUrl: SIGN_IN_PATH })}
				>
					<LogOutIcon />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
