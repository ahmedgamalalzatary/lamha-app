import type { OptionChoice, OptionGroup } from "./types";

export type Selection = Record<string, string[]>;

export function validateChoices(groups: OptionGroup[], sel: Selection) {
  const missing = groups
    .filter((g) => g.required && (sel[g.id]?.length ?? 0) < Math.max(1, g.min))
    .map((g) => g.id);
  return { ok: missing.length === 0, missing };
}

export function toggleChoice(group: OptionGroup, current: string[], choiceId: string): string[] {
  if (group.max === 1) return [choiceId];
  if (current.includes(choiceId)) return current.filter((c) => c !== choiceId);
  if (current.length >= group.max) return current;
  return [...current, choiceId];
}

export function selectedChoices(groups: OptionGroup[], sel: Selection): OptionChoice[] {
  return groups.flatMap((g) => g.choices.filter((c) => sel[g.id]?.includes(c.id)));
}

export function lineKey(itemId: string, choices: Pick<OptionChoice, "id">[], note?: string): string {
  const ids = choices.map((c) => c.id).sort().join(",");
  return `${itemId}|${ids}|${(note ?? "").trim()}`;
}
