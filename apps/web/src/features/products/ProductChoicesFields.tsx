'use client';

import { CATALOG, PRODUCT_OPTIONS, type Product, type ProductOptionsInput } from '@tawsela/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Switch, TextField } from '@/components/ui';

/** The editable choices: text as typed, turned into numbers on save. */
export interface ChoicesDraft {
  groups: { title: string; required: boolean; maxChoices: string; options: { name: string; priceDelta: string }[] }[];
  ingredients: string[];
}

const PRICE = /^\d+(\.\d{1,2})?$/;
const newOption = () => ({ name: '', priceDelta: '0' });

export function draftOf(product?: Product): ChoicesDraft {
  return {
    groups: (product?.optionGroups ?? []).map((g) => ({
      title: g.title,
      required: g.required,
      maxChoices: String(g.maxChoices),
      options: g.options.map((o) => ({ name: o.name, priceDelta: String(o.priceDelta) })),
    })),
    ingredients: (product?.ingredients ?? []).map((i) => i.name),
  };
}

/** Every group has a title and rows, every row a name and a price change, and the limit fits the rows. */
export function draftReady(d: ChoicesDraft): boolean {
  return (
    d.groups.every((g) => {
      const max = Number(g.maxChoices);
      return (
        g.title.trim() !== '' &&
        g.options.length > 0 &&
        Number.isInteger(max) &&
        max >= 1 &&
        max <= g.options.length &&
        g.options.every((o) => o.name.trim() !== '' && PRICE.test(o.priceDelta.trim()))
      );
    }) && d.ingredients.every((i) => i.trim() !== '')
  );
}

export function draftToInput(d: ChoicesDraft): ProductOptionsInput {
  return {
    optionGroups: d.groups.map((g) => ({
      title: g.title.trim(),
      required: g.required,
      maxChoices: Number(g.maxChoices),
      options: g.options.map((o) => ({ name: o.name.trim(), priceDelta: Number(o.priceDelta) })),
    })),
    ingredients: d.ingredients.map((i) => i.trim()),
  };
}

/**
 * The product sheet's choices (contract §8.5): option groups ("الوزن", مطلوب, "اختر 1", rows with a
 * price change) and base ingredients. [Open] Tawsilty's admin form is not captured; the fields follow
 * what the sheet shows.
 */
export function ProductChoicesFields({ draft, onChange }: { draft: ChoicesDraft; onChange: (d: ChoicesDraft) => void }) {
  type Group = ChoicesDraft['groups'][number];
  const setGroup = (gi: number, patch: Partial<Group>) => onChange({ ...draft, groups: draft.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)) });
  const setOption = (gi: number, oi: number, patch: Partial<Group['options'][number]>) =>
    setGroup(gi, { options: draft.groups[gi]!.options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h3 className="font-bold">مجموعات الاختيارات</h3>
        {draft.groups.map((g, gi) => (
          <fieldset key={gi} aria-label={`مجموعة ${gi + 1}`} className="flex flex-col gap-3 rounded-xl border border-tw-line p-3">
            <div className="flex items-end gap-2">
              <TextField label="اسم المجموعة" className="flex-1" value={g.title} maxLength={CATALOG.nameMaxLength} placeholder="الوزن" onChange={(e) => setGroup(gi, { title: e.target.value })} />
              <IconButton label="حذف المجموعة" onClick={() => onChange({ ...draft, groups: draft.groups.filter((_, i) => i !== gi) })}>
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <Switch label="مطلوب" checked={g.required} onChange={(required) => setGroup(gi, { required })} />
              <TextField label="أقصى عدد اختيارات" type="number" min={1} value={g.maxChoices} onChange={(e) => setGroup(gi, { maxChoices: e.target.value })} />
            </div>
            {g.options.map((o, oi) => (
              <div key={oi} className="flex items-end gap-2">
                <TextField label={`اسم الاختيار ${oi + 1}`} className="flex-1" value={o.name} maxLength={CATALOG.nameMaxLength} onChange={(e) => setOption(gi, oi, { name: e.target.value })} />
                <TextField
                  label={`فرق السعر ${oi + 1} (ج.م)`}
                  className="w-32"
                  type="number"
                  min={0}
                  step="0.01"
                  value={o.priceDelta}
                  onChange={(e) => setOption(gi, oi, { priceDelta: e.target.value })}
                />
                <IconButton label={`حذف الاختيار ${oi + 1}`} onClick={() => setGroup(gi, { options: g.options.filter((_, i) => i !== oi) })}>
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            ))}
            <Button
              tone="soft"
              className="h-9 self-start px-4"
              disabled={g.options.length >= PRODUCT_OPTIONS.maxOptions}
              onClick={() => setGroup(gi, { options: [...g.options, newOption()] })}
            >
              <Plus className="size-4" aria-hidden />
              إضافة اختيار
            </Button>
          </fieldset>
        ))}
        <Button
          tone="soft"
          className="h-9 self-start px-4"
          disabled={draft.groups.length >= PRODUCT_OPTIONS.maxGroups}
          onClick={() => onChange({ ...draft, groups: [...draft.groups, { title: '', required: false, maxChoices: '1', options: [newOption()] }] })}
        >
          <Plus className="size-4" aria-hidden />
          إضافة مجموعة اختيارات
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-bold">المكونات الاساسية</h3>
        {draft.ingredients.map((name, i) => (
          <div key={i} className="flex items-end gap-2">
            <TextField
              label={`مكوّن ${i + 1}`}
              className="flex-1"
              value={name}
              maxLength={CATALOG.nameMaxLength}
              onChange={(e) => onChange({ ...draft, ingredients: draft.ingredients.map((v, j) => (j === i ? e.target.value : v)) })}
            />
            <IconButton label={`حذف المكوّن ${i + 1}`} onClick={() => onChange({ ...draft, ingredients: draft.ingredients.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </div>
        ))}
        <Button
          tone="soft"
          className="h-9 self-start px-4"
          disabled={draft.ingredients.length >= PRODUCT_OPTIONS.maxIngredients}
          onClick={() => onChange({ ...draft, ingredients: [...draft.ingredients, ''] })}
        >
          <Plus className="size-4" aria-hidden />
          إضافة مكوّن
        </Button>
      </div>
    </div>
  );
}
