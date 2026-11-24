'use client';

import { ChevronUp, LogOut, Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { api, useSession } from '@/core/api/client';
import { activeHref, filterNav, type NavGroup, navHrefs } from './admin-nav';

/**
 * Tawsilty's admin sidebar (contract §11): light grey, logo and ≡ on top, "ابحث عن شاشة…", sections
 * with an icon, a bold name and a chevron; pages indented on a thin rule; the open page soft orange
 * with an orange bar.
 */
export function Sidebar({ nav }: { nav: NavGroup[] }) {
  const pathname = usePathname();
  const session = useSession();
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const groups = filterNav(nav, query);
  const current = activeHref(pathname, navHrefs(nav));
  const name = session ? `${session.user.firstName} ${session.user.lastName}`.trim() : '';

  const toggle = (label: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col gap-4 overflow-y-auto bg-tw-side px-4 py-5">
      <div className="flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-md bg-tw text-sm font-bold text-white">ت</div>
        <Menu className="size-5 text-tw-ink-2" aria-hidden />
      </div>

      <label className="flex items-center gap-2 rounded-lg bg-tw-input px-3 py-2.5">
        <Search className="size-4 text-tw-ink-2" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن شاشة..."
          aria-label="ابحث عن شاشة"
          className="w-full bg-transparent text-sm outline-none placeholder:text-tw-ink-2"
        />
      </label>

      <nav className="flex flex-col gap-1 text-sm">
        {groups.map(({ label, icon: Icon, href, items }) => {
          if (href) {
            const active = current === href;
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold ${active ? 'bg-tw-50 text-tw' : 'text-tw-ink'}`}
              >
                <Icon className="size-5 text-tw-ink" aria-hidden />
                {label}
              </Link>
            );
          }
          const open = query.trim() !== '' || !closed.has(label);
          return (
            <div key={label} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggle(label)}
                aria-expanded={open}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-bold text-tw-ink"
              >
                <Icon className="size-5" aria-hidden />
                <span className="flex-1 text-start">{label}</span>
                <ChevronUp className={`size-4 text-tw-ink-2 transition-transform ${open ? '' : 'rotate-180'}`} aria-hidden />
              </button>
              {open ? (
                <ul className="ms-5 flex flex-col gap-0.5 border-s border-tw-line ps-3">
                  {items.map((item) => {
                    const active = current === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={`block rounded-lg border-s-2 px-3 py-2 ${
                            active ? 'border-tw bg-tw-50 font-semibold text-tw' : 'border-transparent text-tw-ink-2 hover:text-tw-ink'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* The signed-in account and sign-out, at the foot of the sidebar. */}
      <div className="mt-auto flex flex-col gap-1 border-t border-tw-line pt-3 text-sm">
        <p className="truncate px-3 font-semibold">{name}</p>
        <button
          type="button"
          onClick={() => void api.signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-tw-danger hover:bg-white"
        >
          <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
