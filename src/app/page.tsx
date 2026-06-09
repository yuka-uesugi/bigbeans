import HeroSection from "@/components/visitor-hp/HeroSection";
import ReasonsSection from "@/components/visitor-hp/ReasonsSection";
import BeginnerMessage from "@/components/visitor-hp/BeginnerMessage";
import ContactSection from "@/components/visitor-hp/ContactSection";
import Footer from "@/components/landing/Footer"; // フッターは共通のものを利用

export default function VisitorHomepage() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <ReasonsSection />
      <BeginnerMessage />
      <ContactSection />
      <Footer />
    </main>
  );
}
