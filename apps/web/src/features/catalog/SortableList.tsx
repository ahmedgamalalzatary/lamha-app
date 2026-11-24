'use client';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { mediaUrl } from '@/core/api/client';
import { IconButton } from '@/components/ui';

export interface SortableItem {
  id: number;
  image: string | null;
}

/**
 * A short ordered list (cuisines, home tiles): the image, the text, move up and down, edit and
 * delete. The order is what the customer app shows.
 */
export function SortableList<T extends SortableItem>({
  label,
  items,
  busy,
  render,
  onMove,
  onEdit,
  onDelete,
}: {
  label: string;
  items: T[];
  busy: boolean;
  render: (item: T) => ReactNode;
  onMove: (ids: number[]) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  const move = (index: number, by: -1 | 1) => {
    const ids = items.map((i) => i.id);
    [ids[index], ids[index + by]] = [ids[index + by]!, ids[index]!];
    onMove(ids);
  };
  return (
    <ul aria-label={label} className="flex flex-col rounded-2xl border border-tw-line">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-3 border-t border-tw-line px-4 py-2 first:border-t-0">
          <div className="size-12 shrink-0 overflow-hidden rounded-full bg-tw-input">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.image ? <img src={mediaUrl(item.image)} alt="" className="size-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">{render(item)}</div>
          <IconButton label="تحريك لأعلى" disabled={i === 0 || busy} onClick={() => move(i, -1)}>
            <ArrowUp className="size-4" aria-hidden />
          </IconButton>
          <IconButton label="تحريك لأسفل" disabled={i === items.length - 1 || busy} onClick={() => move(i, 1)}>
            <ArrowDown className="size-4" aria-hidden />
          </IconButton>
          <IconButton label="تعديل" onClick={() => onEdit(item)}>
            <Pencil className="size-4" aria-hidden />
          </IconButton>
          <IconButton label="حذف" onClick={() => onDelete(item)}>
            <Trash2 className="size-4" aria-hidden />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
