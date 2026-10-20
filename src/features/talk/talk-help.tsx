// Help on the talk screen (#599): at elevated a help button, at crisis the
// resources pinned above the composer for the rest of the talk. The level is
// the server's; the companion's crisis line says help is on screen, and this
// is what makes that true.
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { Button } from "heroui-native";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppText } from "@/src/components/shared/app-text";
import { GlassSurface } from "@/src/components/shared/glass-surface";
import { ResourceItem } from "@/src/components/shared/resource-item";

const openHelp = () => router.push("/crisis-resources?from=talk");

export function TalkHelp({ sessionId }: { sessionId: Id<"sessions"> | null }) {
  const help = useQuery(api.talk.safety.help, sessionId ? { sessionId } : "skip");
  if (!help) return null;
  if (help.level === "elevated") {
    return (
      <View className="items-center px-4 pb-2">
        <Button size="sm" variant="secondary" onPress={openHelp}>
          <Button.Label>Get help now</Button.Label>
        </Button>
      </View>
    );
  }
  return (
    <View className="px-4 pb-2">
      <GlassSurface radius={24}>
        <View className="gap-2 p-4">
          <AppText className="text-sm font-semibold text-foreground">People who can help right now</AppText>
          <ScrollView className="max-h-56" contentContainerClassName="gap-2">
            {help.resources.map((r, i) => (
              <ResourceItem key={r.label} resource={r} index={i} />
            ))}
          </ScrollView>
          <Button size="sm" variant="ghost" onPress={openHelp}>
            <Button.Label>More help, in your country</Button.Label>
          </Button>
        </View>
      </GlassSurface>
    </View>
  );
}
