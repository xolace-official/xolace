import { View } from 'react-native';
import { useThemeColor } from 'heroui-native';
import { SymbolView } from 'expo-symbols';
import { NetworkDownIndicator, useChannelContext, useChatContext } from 'stream-chat-expo';
import { AppText } from '@/src/components/shared/app-text';

const OFFLINE_ICON = {
  ios: 'wifi.slash',
  android: 'wifi_off',
  web: 'wifi_off',
} as const;

/**
 * Says out loud what a dead socket otherwise says silently.
 *
 * `streamStatus` only reports how the *connection attempt* went; once it
 * reaches `ready` the thread looks identical whether the socket is alive or
 * has since dropped, and a send just fails. This reads the live state instead.
 *
 * Sits directly above the composer rather than in the header, because
 * `useChatContext` throws outside a mounted `<Chat>` — which is every frame
 * before the client connects, and every `requested` thread, neither of which
 * mounts this component at all.
 *
 */
export function OfflineStrip() {
  const { connectionRecovering, isOnline } = useChatContext();
  const muted = useThemeColor('muted') as string;

  if (isOnline !== false) return null;

  return (
    <View className="flex-row items-center gap-2 border-t border-border/40 bg-surface-secondary px-4 py-2">
      <SymbolView name={OFFLINE_ICON} size={13} tintColor={muted} />
      <AppText className="flex-1 text-[11px] text-muted">
        {connectionRecovering
          ? 'Reconnecting — hold onto that for a second.'
          : "You're offline. Messages won't send until the connection is back."}
      </AppText>
    </View>
  );
}

/**
 * Stream's own `NetworkDownIndicator`, with its offline half removed.
 *
 * That component covers two unrelated states: the socket being down, and the
 * channel failing to load. `OfflineStrip` now owns the first — better placed,
 * and it doesn't fire during the `null` window before NetInfo first answers,
 * which is why the stock one flashes "Reconnecting…" over the top of the list
 * on an ordinary open. The channel-error half has nowhere else to live, so it
 * stays, rendered by Stream so it keeps Stream's styling.
 *
 * Passed to `<Channel>` as the `NetworkDownIndicator` override.
 */
export function ChannelErrorIndicator() {
  const { error } = useChannelContext();
  const { isOnline } = useChatContext();

  if (!isOnline || !error) return null;
  return <NetworkDownIndicator />;
}
