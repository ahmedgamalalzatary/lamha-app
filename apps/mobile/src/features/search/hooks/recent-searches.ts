import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { create } from 'zustand';

const KEY = 'tawsela.search.recent';
export const RECENT_MAX = 6;

const norm = (q: string) => q.trim().replace(/\s+/g, ' ');

/** The list with `q` first: trimmed, never twice (case and spacing aside), at most RECENT_MAX. */
export function addRecent(list: string[], q: string): string[] {
  const word = norm(q);
  if (!word) return list;
  const key = word.toLowerCase();
  return [word, ...list.filter((w) => norm(w).toLowerCase() !== key)].slice(0, RECENT_MAX);
}

const useRecentStore = create<{ list: string[]; loaded: boolean }>(() => ({ list: [], loaded: false }));

function load() {
  if (useRecentStore.getState().loaded) return;
  useRecentStore.setState({ loaded: true });
  AsyncStorage.getItem(KEY)
    .then((v) => {
      const parsed: unknown = v ? JSON.parse(v) : [];
      if (Array.isArray(parsed)) useRecentStore.setState({ list: parsed.filter((w): w is string => typeof w === 'string').slice(0, RECENT_MAX) });
    })
    .catch(() => undefined);
}

const add = (q: string) => {
  const next = addRecent(useRecentStore.getState().list, q);
  useRecentStore.setState({ list: next });
  void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
};

const clear = () => {
  useRecentStore.setState({ list: [] });
  void AsyncStorage.removeItem(KEY).catch(() => undefined);
};

/** Tests start each case with nothing remembered. */
export const resetRecentSearches = () => useRecentStore.setState({ list: [], loaded: false });

/**
 * "بحثت قبل كده" (L1 #4): the customer's last searches, kept on this phone only (the server keeps no
 * search tied to a person).
 */
export function useRecentSearches() {
  const list = useRecentStore((s) => s.list);
  useEffect(load, []);
  return { list, add, clear };
}
