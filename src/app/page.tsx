import type { Metadata } from "next";
import HeroSection from "@/components/visitor-hp/HeroSection";
import ReasonsSection from "@/components/visitor-hp/ReasonsSection";
import BeginnerMessage from "@/components/visitor-hp/BeginnerMessage";
import ContactSection from "@/components/visitor-hp/ContactSection";
import Footer from "@/components/landing/Footer"; // フッターは共通のものを利用

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

// 検索エンジン向けの構造化データ（このサイトが横浜のバドミントンサークルであることを機械的に伝える）
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SportsClub",
  name: "Big Beans",
  alternateName: "ビックビーンズ",
  url: "https://bigbeans.vercel.app",
  logo: "https://bigbeans.vercel.app/icon-512.png",
  image: "https://bigbeans.vercel.app/logo-wide.png",
  sport: "バドミントン",
  description:
    "横浜市都筑区を中心に活動するレディースバドミントンサークル。初級者・ブランクのある方も歓迎、ビジター参加も募集中。",
  address: {
    "@type": "PostalAddress",
    addressLocality: "横浜市都筑区",
    addressRegion: "神奈川県",
    addressCountry: "JP",
  },
  areaServed: ["横浜市都筑区", "横浜市緑区", "横浜市青葉区"],
  email: "bigbeans.tsuduki@gmail.com",
};

export default function VisitorHomepage() {
  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HeroSection />
      <ReasonsSection />
      <BeginnerMessage />
      <ContactSection />
      <Footer />
    </main>
  );
}
