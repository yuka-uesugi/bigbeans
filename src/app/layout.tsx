import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const SITE_TITLE =
  "Big Beans（ビックビーンズ）｜横浜市都筑区のバドミントンサークル・初級者歓迎";
const SITE_DESCRIPTION =
  "横浜市都筑区を中心に活動するレディースバドミントンサークル Big Beans（ビックビーンズ）。初級者・ブランクのある方も大歓迎、ビジター参加も募集中。横浜市北部（都筑区・緑区・青葉区）の施設で練習しています。見学・体験のお問い合わせはお気軽にどうぞ。";

export const metadata: Metadata = {
  metadataBase: new URL("https://bigbeans.vercel.app"),
  title: {
    default: SITE_TITLE,
    template: "%s｜Big Beans",
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "https://bigbeans.vercel.app",
    siteName: "Big Beans",
    images: [
      {
        url: "/logo-wide.png",
        width: 1200,
        height: 400,
        alt: "Big Beans",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/logo-wide.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Big Beans",
    startupImage: "/icon-512.png",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#84cc16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <head>
        {/* iOS専用：ホーム画面追加時にアドレスバーを非表示にする */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Big Beans" />
        {/* iOS アプリアイコン */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        {/* Android用テーマカラー */}
        <meta name="theme-color" content="#84cc16" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
