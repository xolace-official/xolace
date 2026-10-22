import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { ConnectScreen } from '@/src/features/xolacer-chat/components/connect-screen';

/**
 * NativeTabs renders every tab's content as soon as the navigator mounts — it
 * has no lazy option on either platform. So landing on Discovery also mounted
 * this screen: two Convex queries, four Skia shimmer skeletons, the full
 * conversation list, and the Stream token fetch + WS handshake, all on the same
 * JS thread as the Discovery entrance.
 *
 * Held back until this tab is actually focused. Once mounted it stays mounted,
 * so switching tabs afterwards is still instant.
 */
export default function ConnectRoute() {
  const isFocused = useIsFocused();
  // Optional: `specialty` lands on the roster pre-filtered to that tag, `view`
  // picks a segment outright (a notification tap, which cannot be left to the
  // tab's remembered one), and `t` is the tap's timestamp — without it a second
  // tap carries identical params and reads as no navigation at all. `stepId`
  // is the kindling twig that sent us, completed once a request is sent.
  const { specialty, view, t, stepId } = useLocalSearchParams<{
    specialty?: string;
    view?: string;
    t?: string;
    stepId?: string;
  }>();
  // Latched during render rather than in an effect, so the first focused frame
  // already renders the screen instead of a blank one.
  const [everFocused, setEverFocused] = useState(isFocused);
  if (isFocused && !everFocused) setEverFocused(true);

  if (!everFocused) return <View className="flex-1 bg-background" />;
  return <ConnectScreen specialty={specialty} view={view} navToken={t} stepId={stepId} />;
}
