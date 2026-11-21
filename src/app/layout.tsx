import type { Metadata, Viewport } from "next";
import { Readex_Pro, Aref_Ruqaa } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/brand";

const readex = Readex_Pro({ variable: "--font-readex", subsets: ["arabic", "latin"], weight: ["300", "400", "500", "600", "700"] });
const ruqaa = Aref_Ruqaa({ variable: "--font-ruqaa", subsets: ["arabic"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: `${BRAND.nameAr} · ${BRAND.nameEn}`,
  description: BRAND.tagline,
  applicationName: BRAND.nameEn,
  appleWebApp: { capable: true, title: BRAND.nameAr, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1c2fa8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} ${ruqaa.variable} antialiased`}>
      <body>
        <div className="app-column">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
