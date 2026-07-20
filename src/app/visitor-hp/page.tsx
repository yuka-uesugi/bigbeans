import HeroSection from "@/components/visitor-hp/HeroSection";
import AboutSection from "@/components/visitor-hp/AboutSection";
import BeginnerMessage from "@/components/visitor-hp/BeginnerMessage";
import JoinSection from "@/components/visitor-hp/JoinSection";
import ContactSection from "@/components/visitor-hp/ContactSection";
import Footer from "@/components/landing/Footer"; // フッターは共通のものを利用

export default function VisitorHomepage() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <AboutSection />
      <BeginnerMessage />
      <JoinSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
