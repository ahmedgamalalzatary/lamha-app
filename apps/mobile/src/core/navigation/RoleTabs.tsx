import type { Role } from '@tawsela/shared';
import { Tabs } from 'expo-router';
import { useT } from '../i18n';
import { LamhaTabBar } from './LamhaTabBar';
import { tabsForRole } from './tabs';

/** A role's tab bar (contract §6.3), drawn by lamha's tab bar; `badges` puts a number on a tab. */
export function RoleTabs({ role, badges }: { role: Role; badges?: Partial<Record<string, number>> }) {
  const t = useT();
  const tabs = tabsForRole(role);
  const labels = Object.fromEntries(tabs.map((s) => [s.name, t(s.label)]));
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <LamhaTabBar {...props} tabs={tabs} labels={labels} badges={badges} />}>
      {tabs.map(({ name, label }) => (
        <Tabs.Screen key={name} name={name} options={{ title: t(label) }} />
      ))}
    </Tabs>
  );
}
