import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StatsSection from "@/components/landing/StatsSection";
import Footer from "@/components/landing/Footer";
import VisitorGuideSection from "@/components/landing/VisitorGuideSection";
import MemberBenefitsSection from "@/components/landing/MemberBenefitsSection";
import VisitorJoinSection from "@/components/landing/VisitorJoinSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <VisitorGuideSection />
      <MemberBenefitsSection />
      <VisitorJoinSection />
      <Footer />
    </>
  );
}
