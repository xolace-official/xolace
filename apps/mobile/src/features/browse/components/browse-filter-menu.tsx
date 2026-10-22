import { Stack } from 'expo-router';
import FilterList from '@expo/material-symbols/filter_list.xml';

export type FilterOption<T extends string> = { value: T; label: string; icon?: 'waveform' | 'music.note'; disabled?: boolean };

/**
 * The header-right native filter menu shared by the Browse lists: one inline
 * radio group (`isOn` marks the current pick). SF Symbol action icons are
 * iOS-only — Android silently drops them, which is fine for a text menu.
 */
export function BrowseFilterMenu<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon={process.env.EXPO_OS === 'ios' ? 'line.3.horizontal.decrease' : FilterList}
        accessibilityLabel={title}
      >
        <Stack.Toolbar.Menu inline title={title}>
          {options.map((o) => (
            <Stack.Toolbar.MenuAction
              key={o.value}
              icon={o.icon}
              isOn={value === o.value}
              disabled={o.disabled}
              onPress={() => onChange(o.value)}
            >
              {o.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
