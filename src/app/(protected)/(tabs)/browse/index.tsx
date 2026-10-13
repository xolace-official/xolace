import { useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { BrowseHome } from '@/src/features/browse/search/browse-home';

/**
 * NativeTabs mounts every tab eagerly (see connect/index.tsx's ConnectRoute) —
 * held back until focused so landing on Discovery doesn't also fire the New
 * shelf query and mint R2 URLs for a tab the user hasn't opened yet.
 */
export default function BrowseRoute() {
  const isFocused = useIsFocused();
  const [everFocused, setEverFocused] = useState(isFocused);
  if (isFocused && !everFocused) setEverFocused(true);

  if (!everFocused) return <View className="flex-1 bg-background" />;
  return <BrowseHome />;
}
