"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

import { AudioProvider } from "@/features/audio/audio-provider";
import { ImportsFixtureProvider } from "@/features/imports/imports-provider";
import { LibraryProvider } from "@/features/library/library-provider";

import { ENV } from "../env";

const convex = new ConvexReactClient(ENV.NEXT_PUBLIC_CONVEX_URL);

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
			{/* One store per domain for the whole app: Overview reads all three, a hub
			    lists audio, and an import run keeps processing while you move around.
			    Library and Audio read Convex; Imports is still fixtures (admin step 6c). */}
			<LibraryProvider>
				<AudioProvider>
					<ImportsFixtureProvider>{children}</ImportsFixtureProvider>
				</AudioProvider>
			</LibraryProvider>
		</ConvexProviderWithClerk>
	);
}
