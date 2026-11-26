import type { Metadata } from 'next';
import { Alexandria } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const alexandria = Alexandria({ variable: '--font-alexandria', subsets: ['arabic', 'latin'] });

export const metadata: Metadata = {
  title: 'وصّل | لوحة التحكم',
  description: 'لوحة تحكم وصّل',
};

/** Arabic RTL. Each area (admin, `/partner`) brings its own sidebar; sign-in has none. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ar" dir="rtl" className={`${alexandria.variable} h-full antialiased`}>
      <body className="flex min-h-full font-tw">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
