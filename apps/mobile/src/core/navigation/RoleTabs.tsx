import type { Role } from '@tawsela/shared';
import { Tabs } from 'expo-router';
import { useT } from '../i18n';
import { colors, fonts } from '../theme';
import { tabsForRole } from './tabs';

/** A role's tab bar (contract §6.3): active tab orange, others grey. */
export function RoleTabs({ role }: { role: Role }) {
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
          options={{ title: t(label), tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }}
        />
      ))}
    </Tabs>
  );
}
