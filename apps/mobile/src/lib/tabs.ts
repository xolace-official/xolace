/**
 * Tab configuration for the native tab bar.
 *
 * Each tab maps to a route file in src/app/ by `name`.
 * Icons use SF Symbols (`sf`/`selected`) on iOS and Material symbols (`md`) on Android.
 *
 * To customize tabs for your app:
 * - Add/remove entries here and create the matching route file in src/app/
 * - Find SF Symbol names at https://developer.apple.com/sf-symbols/
 * - Find Material icon names at https://fonts.google.com/icons
 */
export const TABS = [
     {
        name: 'index',
        label: 'Home',
        icon: {
            sf: 'house',
            selected: 'house.fill',
            md: 'home',
        },
    },
    {
        name: 'explore',
        label: 'Explore',
        icon: {
            sf: 'safari',
            selected: 'safari.fill',
            md: 'explore',
        },
    },
    {
        name: 'theme',
        label: 'Theme',
        icon: {
            sf: 'circle',
            selected: 'circle.fill',
            md: 'circle',
        },
    }
] as const;