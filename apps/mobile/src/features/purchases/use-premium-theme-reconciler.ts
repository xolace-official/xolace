import { useEffect } from 'react';
import { Uniwind } from 'uniwind';
import { useAppStore } from '@/src/store/store';
import { usePreferenceMutation } from '@/src/features/settings/hooks/use-preference-mutation';
import { usePlusEntitlement } from './use-plus-entitlement';
import { planPremiumThemeReset } from './premium-theme-reset';

/**
 * Drops a lapsed subscriber off a premium theme.
 *
 * `colorThemeId` is persisted locally and re-applied by theme-bootstrap.ts on
 * every cold start, long before the entitlement is known — so without this, a
 * user who picked a Plus theme and then let their subscription lapse would keep
 * it forever. Once the entitlement resolves to not-Plus, reset to `default`.
 *
 * The decision (whether/how to reset) lives in `planPremiumThemeReset`; this
 * hook only applies the store + Uniwind writes it returns.
 */
export function usePremiumThemeReconciler() {
  const { isPlus, isResolved } = usePlusEntitlement();
  const colorThemeId = useAppStore((s) => s.colorThemeId);
  const updatePreferences = usePreferenceMutation();

  useEffect(() => {
    const {
      theme: storedTheme,
      previousTheme,
      setColorThemeId,
      setPreviousTheme,
    } = useAppStore.getState();

    const plan = planPremiumThemeReset({
      isPlus,
      isResolved,
      colorThemeId,
      previousTheme,
      currentTheme: Uniwind.currentTheme,
      storedTheme,
    });
    if (!plan) return;

    setColorThemeId('default');
    updatePreferences({ colorTheme: 'default' });

    if (plan.clearPreviousTheme) setPreviousTheme(null);
    if (plan.applyBaseTheme !== null) {
      Uniwind.setTheme(plan.applyBaseTheme as never);
    }
  }, [isPlus, isResolved, colorThemeId, updatePreferences]);
}
