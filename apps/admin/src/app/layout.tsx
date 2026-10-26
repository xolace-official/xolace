import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@xolace/ui/components/tooltip";
import type { Metadata } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";
import { AdminShell } from "@/features/shell/admin-shell";

// Nunito for headings, buttons and labels; Space Grotesk for body and data.
// @xolace/ui/globals.css reads these two variables.
const nunito = Nunito({
	subsets: ["latin"],
	variable: "--font-nunito",
	weight: ["600", "700", "800", "900"],
});
const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
	description: "Internal Xolace dashboard",
	robots: { follow: false, index: false },
	title: "Xolace Admin",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className={`${nunito.variable} ${spaceGrotesk.variable}`} lang="en">
			<body className="antialiased">
				<ClerkProvider>
					<Providers>
						<TooltipProvider>
							<AdminShell>{children}</AdminShell>
						</TooltipProvider>
					</Providers>
				</ClerkProvider>
			</body>
		</html>
	);
}
