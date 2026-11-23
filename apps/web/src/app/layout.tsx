import type { Metadata } from 'next';
import { Alexandria } from 'next/font/google';
import { Sidebar } from '@/features/nav/Sidebar';
import { Providers } from './providers';
import './globals.css';

const alexandria = Alexandria({ variable: '--font-alexandria', subsets: ['arabic', 'latin'] });

export const metadata: Metadata = {
  title: 'توصيلة | لوحة التحكم',
  description: 'لوحة تحكم توصيلة',
};

/** Arabic RTL, the sidebar on the right (contract §11). */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} h-full antialiased`}>
      <body className="flex min-h-full font-tw">
        <Providers>
          <Sidebar />
          <main className="min-w-0 flex-1 p-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
