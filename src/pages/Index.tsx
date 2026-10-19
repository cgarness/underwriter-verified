import { useParams } from "react-router-dom";
import { useAgentProfile } from "@/hooks/useAgentProfile";
import { PublicAgentDataProvider } from "@/contexts/AgentDataContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import AgentProfileLayout from "@/components/AgentProfileLayout";
import { Loader2 } from "lucide-react";
import ManagedContactCard from "@/components/ManagedContactCard";

export default function Index() {
  const { agencySlug, agentSlug } = useParams<{ agencySlug: string; agentSlug: string }>();
  const { data: agent, isLoading, error } = useAgentProfile(agencySlug, agentSlug);
  usePageTitle(
    isLoading
      ? "Loading profile"
      : agent
        ? `${agent.name} | ${agent.contactCardOnly ? "Agent Profile" : agent.agency || "Licensed Life Insurance Agent"}`
        : "Agent Not Found"
  );

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

  if (agent.contactCardOnly) return <ManagedContactCard agent={agent} />;

  return (
    <PublicAgentDataProvider key={`${agencySlug}/${agentSlug}`} data={agent}>
      <AgentProfileLayout />
    </PublicAgentDataProvider>
  );
}
