import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '../theme';
import type { TabSpec } from './tabs';

interface Props extends BottomTabBarProps {
  tabs: TabSpec[];
  labels: Record<string, string>;
  badges?: Partial<Record<string, number>>;
}

/**
 * lamha's tab bar: white with a hairline on top; the active tab gets a short pen line along the top
 * edge, a pen icon drawn bolder and a semibold pen label; the rest are grey. A count sits on a tab's
 * icon as a pen circle with a white ring.
 */
export function LamhaTabBar({ state, emitter, navigateToTab, insets, tabs, labels, badges }: Props) {
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {state.routes.map((route, index) => {
        const spec = tabs.find((t) => t.name === route.name);
        if (!spec) return null;
        const on = state.index === index;
        const Icon = spec.icon;
        const color = on ? colors.primary : colors.ink3;
        const badge = badges?.[route.name];
        const label = labels[route.name] ?? route.name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={badge ? `${label}، ${badge}` : label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!on && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
          >
            {on ? <View style={styles.ink} /> : null}
            <View>
              <Icon size={22} color={color} strokeWidth={on ? 2.3 : 1.8} />
              {badge ? (
                <View style={styles.badge}>
                  <AppText weight="bold" size={10.5} color={colors.sheet}>
                    {String(badge)}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText weight={on ? 'semibold' : 'regular'} size={11.5} color={color}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.sheet, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  tab: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6 },
  ink: { position: 'absolute', top: 0, width: 40, height: 3, borderBottomLeftRadius: radius.pill, borderBottomRightRadius: radius.pill, backgroundColor: colors.primary },
  badge: {
    position: 'absolute',
    top: -6,
    end: -8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.sheet,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
