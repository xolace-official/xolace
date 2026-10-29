"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { AudioProvider } from "@/features/audio/audio-provider";
import { ImportsProvider } from "@/features/imports/imports-provider";
import { LibraryProvider } from "@/features/library/library-provider";

import { ENV } from "../env";

const convex = new ConvexReactClient(ENV.NEXT_PUBLIC_CONVEX_URL);

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
			{/* One store per domain for the whole app: Overview reads all three, a hub
			    lists audio, and the imports list stays live while you move around. */}
			<LibraryProvider>
				<AudioProvider>
					<ImportsProvider>{children}</ImportsProvider>
				</AudioProvider>
			</LibraryProvider>
		</ConvexProviderWithClerk>
	);
}
