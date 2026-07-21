import type { Metadata } from "next";
import HeroSection from "@/components/visitor-hp/HeroSection";
import AboutSection from "@/components/visitor-hp/AboutSection";
import BeginnerMessage from "@/components/visitor-hp/BeginnerMessage";
import JoinSection from "@/components/visitor-hp/JoinSection";
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
    "横浜市都筑区を中心に活動する社会人女性（レディース）のバドミントンサークル。初級者から上級者まで歓迎、ビジター参加も募集中。全日本レディースバドミントン選手権大会出場。",
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
      <AboutSection />
      <BeginnerMessage />
      <JoinSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
