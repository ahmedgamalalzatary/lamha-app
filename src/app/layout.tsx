import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";

/* talabat.com ships Noto Sans Arabic for Arabic text; Noto Sans covers Latin and digits */
const notoArabic = Noto_Sans_Arabic({ variable: "--font-noto-arabic", subsets: ["arabic"], weight: ["300", "400", "500", "600", "700", "800"] });
const notoLatin = Noto_Sans({ variable: "--font-noto-latin", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: `${BRAND.nameAr} · ${BRAND.nameEn}`,
  description: BRAND.tagline,
  applicationName: BRAND.nameEn,
  appleWebApp: { capable: true, title: BRAND.nameAr, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f55905",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${notoArabic.variable} ${notoLatin.variable} antialiased`}>
      <body>
        <div className="app-column">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
