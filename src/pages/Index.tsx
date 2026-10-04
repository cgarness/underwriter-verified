import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import { useAgentData } from "@/contexts/AgentDataContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import TrustBar from "@/components/TrustBar";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import CredentialsSection from "@/components/CredentialsSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import LeadCaptureSection from "@/components/LeadCaptureSection";
import LegalSection from "@/components/LegalSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { agencySlug, agentSlug } = useParams<{ agencySlug: string; agentSlug: string }>();
  const { data: agent, isLoading, error } = useAgentProfile(agencySlug, agentSlug);
  const { updateData } = useAgentData();
  usePageTitle(
    isLoading
      ? "Loading profile"
      : agent
        ? `${agent.name} | ${agent.agency || "Licensed Life Insurance Agent"}`
        : "Agent Not Found"
  );

  // Populate context so all child components read from it
  useEffect(() => {
    if (agent) updateData(agent);
  }, [agent]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">Agent Not Found</h1>
        <p className="text-muted-foreground">The agent profile you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TrustBar />
      <Header />
      <HeroSection />
      <CredentialsSection />
      <AboutSection />
      <ServicesSection />
      <TestimonialsSection />
      <LeadCaptureSection
        agentName={agent.name}
        agencyName={agent.agency}
        agencySlug={agencySlug ?? ""}
        agentSlug={agentSlug ?? ""}
      />
      <LegalSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
