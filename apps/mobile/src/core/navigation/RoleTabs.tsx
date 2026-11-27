import type { Role } from '@tawsela/shared';
import { Tabs } from 'expo-router';
import { useT } from '../i18n';
import { colors, fonts } from '../theme';
import { tabsForRole } from './tabs';

/** A role's tab bar (contract §6.3): active tab orange, others grey; `badges` puts a number on a tab. */
export function RoleTabs({ role, badges }: { role: Role; badges?: Partial<Record<string, number>> }) {
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.ink2,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      {tabsForRole(role).map(({ name, label, icon: Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(label),
            tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />,
            tabBarBadge: badges?.[name],
            tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.bg, fontFamily: fonts.medium, fontSize: 11 },
          }}
        />
      ))}
    </Tabs>
  );
}
