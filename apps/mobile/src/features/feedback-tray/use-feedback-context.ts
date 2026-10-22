import Constants from 'expo-constants';
import { usePathname } from 'expo-router';
import { useAppTheme } from '@/src/context/app-theme-context';

/** Submission context for a `product_feedback` row — triage without content. */
export function useFeedbackContext() {
  const pathname = usePathname();
  const { currentTheme } = useAppTheme();
  return {
    appVersion: Constants.expoConfig?.version ?? '',
    route: pathname,
    themeName: currentTheme,
    platform: process.env.EXPO_OS ?? '',
  };
}
