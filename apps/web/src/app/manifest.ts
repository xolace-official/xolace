import type { MetadataRoute } from "next";

// Static so it also works in the desktop static export (TAURI_BUILD=1).
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
	return {
		background_color: "#ffffff",
		description: "my pwa app",
		display: "standalone",
		icons: [
			{
				sizes: "192x192",
				src: "/favicon/web-app-manifest-192x192.png",
				type: "image/png",
			},
			{
				sizes: "512x512",
				src: "/favicon/web-app-manifest-512x512.png",
				type: "image/png",
			},
		],
		name: "Xolace",
		short_name: "Xolace",
		start_url: "/",
		theme_color: "#000000",
	};
}
