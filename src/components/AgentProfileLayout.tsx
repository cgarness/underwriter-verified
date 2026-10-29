import { useParams } from "react-router-dom";
import { useAgentData } from "@/contexts/AgentDataContext";
import TrustBar from "@/components/TrustBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CredentialsSection from "@/components/CredentialsSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AgentReviewsSection from "@/components/AgentReviewsSection";
import LeadCaptureSection from "@/components/LeadCaptureSection";
import LegalSection from "@/components/LegalSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

/** One visual layout; contact-card capability controls forms, never identity. */
export default function AgentProfileLayout() {
  const { data: agent } = useAgentData();
  const { agencySlug, agentSlug } = useParams();
  return (
    <div className="min-h-screen">
      <TrustBar />
      <Header />
      <HeroSection />
      <CredentialsSection />
      {agent.bio.trim() && <AboutSection />}
      <ServicesSection />
      {agent.id && <AgentReviewsSection />}
      {agent.testimonials.length > 0 && <TestimonialsSection />}
      {!agent.contactCardOnly && <LeadCaptureSection
        agentName={agent.name}
        agencyName={agent.agency}
        agencySlug={agencySlug ?? ""}
        agentSlug={agentSlug ?? ""}
      />}
      {!agent.contactCardOnly && <LegalSection />}
      <ContactSection />
      <Footer />
    </div>
  );
}
