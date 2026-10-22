import { Platform } from "react-native";

export const WEBSITE_URL = "https://xolaceinc.com";

// Platform.select is inlined at build time, so the Play URL never lands in the
// iOS binary (App Review 2.3.10 rejects Google Play references).
export const STORE_URL = Platform.select({
  ios: "https://apps.apple.com/app/xolace/id6761601429",
  android: "https://play.google.com/store/apps/details?id=com.xolaceincorg.xolace",
});
